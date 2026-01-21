# StreamView - Платформа для трансляций

Полнофункциональная платформа для потоковых трансляций с поддержкой категорий, чата, профилей пользователей и живых превью.

## Технологический стек

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Видео**: FFmpeg, HLS (HTTP Live Streaming), HLS.js
- **База данных**: PostgreSQL, Prisma ORM
- **Аутентификация**: JWT токены в cookies
- **Чат**: Real-time сообщения (периодическая загрузка)

## Требования

- Node.js 18+
- npm или pnpm
- PostgreSQL 12+
- FFmpeg
- Git

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd acs
```

### 2. Установка зависимостей

```bash
npm install
# или
pnpm install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Приватный ключ для JWT токенов
AUTH_SECRET=your-super-secret-key-change-this-in-production

# Строка подключения к PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/streamview_db"

# Переменная окружения
NODE_ENV=development
```

### Пример полного `.env` файла для локальной разработки

```env
# === Authentication ===
AUTH_SECRET=dev-secret-key-12345-change-in-production

# === Database ===
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streamview"

```

### 4. Настройка базы данных

```bash
# Запустить миграции Prisma
npx prisma migrate dev --name init

# (Если миграции не применились) Снова запустить миграцию
npx prisma migrate dev --name add_nickname_and_displayname
```

### 5. Добавление категорий (опционально)

```bash
# Запустить скрипт добавления категорий
node scripts/add-categories.js
```

### Создание категорий

Категории могут быть добавлены только администратором:

```bash
# Отредактировать массив категорий в scripts/add-categories.js
node scripts/add-categories.js
```