# Python'un resmi imajını temel al
FROM python:3.10-slim

# Çalışma dizinini ayarla
WORKDIR /code

# Sistem bağımlılıklarını kur (geospatial kütüphaneler için gerekli)
RUN apt-get update && apt-get install -y libgdal-dev gcc

# requirements.txt dosyasını kopyala ve kütüphaneleri kur
# Bu adımı kod kopyalamadan önce yapmak, kod değişmediği sürece
# kütüphanelerin tekrar kurulmasını engelleyerek build süresini kısaltır.
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Proje dosyalarının tamamını kopyala
COPY . /code/