# Sentiment Analyzer - Easy Version

## Kya badla gaya?

**Purana version (Heavy):**
- HuggingFace Transformers (500MB+)
- PyTorch (1-2GB)
- Seedhe laptop pe run nahi hota tha

**Naya version (Easy):**
- Sirf Django chahiye
- Koi ML model download nahi
- Keyword-based analysis — fast aur simple!

---

## Setup (Simple Steps)

### Windows
```
pip install django
python manage.py runserver
```

### Mac / Linux
```
pip3 install django
python3 manage.py runserver
```

### Ya seedha script chalao
```
bash run.sh
```

Browser mein kholo: **http://127.0.0.1:8000**

---

## Kaise kaam karta hai?

Positive/negative keywords check karta hai text mein.
- "great", "love", "amazing" → Positive
- "bad", "hate", "terrible" → Negative
- Baaki → Neutral

Negation bhi handle hoti hai: "not good" → Negative

---

## Files

```
sentiment_analyzer_easy/
├── manage.py
├── requirements.txt         ← Sirf django
├── run.sh                   ← Easy start script
├── sentiment_app/
│   ├── services.py          ← Simple keyword analyzer (no ML!)
│   ├── db.py                ← In-memory storage
│   ├── views.py             ← API endpoints
│   └── templates/           ← Frontend UI
└── sentiment_project/
    └── settings.py
```
