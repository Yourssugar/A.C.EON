Модели распознавания речи для субтитров в монтаже.

whisper-base/  Whisper base (OpenAI, лицензия MIT), версия ONNX с квантованием из Xenova/whisper-base (Hugging Face).
               Файлы 23 и 54 МБ. Если их нет на сайте, мастерская скачает их с Hugging Face и сохранит в кэше браузера.
whisper-small/ здесь только vocab.json. Сами файлы small больше 100 МБ, GitHub их не принимает,
               поэтому они всегда скачиваются с Hugging Face (Xenova/whisper-small) и хранятся в кэше браузера.

Звук ролика никуда не отправляется: распознавание идёт в браузере (whisper.js, ONNX Runtime из ../../grafika/ai/).
