# План разработки

## Шаг 1: Инициализация

```bash
npm init
```

Копировать из SPEC.md → секция 1.2 (package.json)  
Копировать из SPEC.md → секция 1.3 (tsconfig.json)

## Шаг 2: Структура

```bash
mkdir -p credentials
mkdir -p nodes/Soniox/descriptions
```

## Шаг 3: Credentials

Создать: `credentials/SonioxApi.credentials.ts`  
Код: SPEC.md → секция 2.1

## Шаг 4: Descriptions

Создать: `nodes/Soniox/descriptions/FileDescription.ts`  
Код: SPEC.md → секция 4.1

Создать: `nodes/Soniox/descriptions/TranscriptionDescription.ts`  
Код: SPEC.md → секция 4.2

Создать: `nodes/Soniox/descriptions/ModelDescription.ts`  
Код: SPEC.md → секция 4.3

## Шаг 5: GenericFunctions

Создать: `nodes/Soniox/GenericFunctions.ts`  
Код: SPEC.md → секция 5.1

## Шаг 6: Main Node

Создать: `nodes/Soniox/Soniox.node.ts`  
Код: SPEC.md → секция 3 + 6

## Шаг 7: Сборка

```bash
npm install
npm run build
```

## Шаг 8: Тестирование

```bash
npm link
# В n8n:
# Settings → Community Nodes → Install from local
```

Тест:
1. Создать credentials
2. Добавить Soniox node
3. Upload файл
4. Create transcription
5. Get результат

## Готово

Всё.
