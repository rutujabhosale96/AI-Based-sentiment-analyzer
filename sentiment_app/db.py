import logging
import uuid

logger = logging.getLogger(__name__)

_db = None


def get_db():
    """Get in-memory database instance (singleton)."""
    global _db
    if _db is None:
        _db = InMemoryDB()
        logger.info("Using in-memory database.")
    return _db


class InMemoryDB:
    """Simple in-memory store — no MongoDB needed."""

    def __init__(self):
        self._collections = {}

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name)
        return self._collections[name]

    def __getattr__(self, name):
        return self[name]

    def list_collection_names(self):
        return list(self._collections.keys())


class InMemoryCollection:
    """Mimics pymongo collection interface in memory."""

    def __init__(self, name):
        self.name = name
        self._docs = []

    def insert_one(self, doc):
        doc['_id'] = str(uuid.uuid4())
        self._docs.append(dict(doc))

        class Result:
            inserted_id = doc['_id']
        return Result()

    def find(self, query=None, *args, **kwargs):
        if not query:
            return iter(list(self._docs))
        results = [
            doc for doc in self._docs
            if all(doc.get(k) == v for k, v in query.items())
        ]
        return iter(results)

    def find_one(self, query=None):
        for doc in self.find(query):
            return doc
        return None

    def count_documents(self, query=None):
        return sum(1 for _ in self.find(query or {}))

    def aggregate(self, pipeline):
        docs = list(self._docs)
        for stage in pipeline:
            if '$group' in stage:
                group = stage['$group']
                gid = group.get('_id')
                groups = {}
                for doc in docs:
                    key = doc.get(gid.lstrip('$')) if isinstance(gid, str) and gid.startswith('$') else str(gid)
                    if key not in groups:
                        groups[key] = {'_id': key, 'count': 0}
                    groups[key]['count'] += 1
                docs = list(groups.values())
            elif '$sort' in stage:
                sort_field = list(stage['$sort'].keys())[0]
                reverse = stage['$sort'][sort_field] == -1
                docs = sorted(docs, key=lambda x: x.get(sort_field, 0), reverse=reverse)
            elif '$limit' in stage:
                docs = docs[:stage['$limit']]
        return iter(docs)

    def delete_many(self, query):
        if not query:
            self._docs = []
