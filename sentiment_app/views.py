import json
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .services import (
    analyze_and_store,
    bulk_analyze,
    get_all_analyses,
    get_summary_stats,
    clear_all_analyses,
)

logger = logging.getLogger(__name__)


def index(request):
    """Main dashboard page."""
    return render(request, 'sentiment_app/index.html')


@csrf_exempt
@require_http_methods(["POST"])
def analyze(request):
    """Analyze a single text input."""
    try:
        body = json.loads(request.body)
        text = body.get('text', '').strip()
        source = body.get('source', 'manual')

        if not text:
            return JsonResponse({'error': 'Text is required.'}, status=400)

        if len(text) > 5000:
            return JsonResponse({'error': 'Text too long. Max 5000 characters.'}, status=400)

        result = analyze_and_store(text, source=source)
        return JsonResponse({'success': True, 'result': result})

    except Exception as e:
        logger.exception("Error in analyze view")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def bulk_analyze_view(request):
    """Analyze multiple texts at once (newline-separated)."""
    try:
        body = json.loads(request.body)
        raw_texts = body.get('texts', '')
        source = body.get('source', 'bulk')

        texts = [t.strip() for t in raw_texts.split('\n') if t.strip()]

        if not texts:
            return JsonResponse({'error': 'No valid texts provided.'}, status=400)

        if len(texts) > 50:
            return JsonResponse({'error': 'Max 50 texts per bulk request.'}, status=400)

        results = bulk_analyze(texts, source=source)
        return JsonResponse({'success': True, 'results': results, 'count': len(results)})

    except Exception as e:
        logger.exception("Error in bulk_analyze view")
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def history(request):
    """Return analysis history as JSON."""
    try:
        analyses = get_all_analyses(limit=200)
        return JsonResponse({'success': True, 'analyses': analyses})
    except Exception as e:
        logger.exception("Error in history view")
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def stats(request):
    """Return summary statistics."""
    try:
        summary = get_summary_stats()
        return JsonResponse({'success': True, 'stats': summary})
    except Exception as e:
        logger.exception("Error in stats view")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def reset(request):
    """Clear all analyses."""
    try:
        clear_all_analyses()
        return JsonResponse({'success': True, 'message': 'All analyses cleared.'})
    except Exception as e:
        logger.exception("Error in reset view")
        return JsonResponse({'error': str(e)}, status=500)
