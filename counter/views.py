from django.http import JsonResponse
from django.http import HttpResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt

from .models import Counter
from .converter import CounterSerializer


def read(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    counter = Counter.objects.all()
    counter_json = CounterSerializer(counter, many=True).data

    return JsonResponse(counter_json, safe=False)


@csrf_exempt
def increase(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    Counter.objects.first().increment()
    return HttpResponse()
