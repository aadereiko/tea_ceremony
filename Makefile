.DEFAULT_GOAL := help
SHELL := /bin/bash

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install API and web dependencies
	cd api && uv sync
	cd web && npm install

migrate: ## Create or update the database tables
	cd api && uv run alembic upgrade head

api: migrate ## Run the API on :8000 with reload
	cd api && uv run uvicorn app.main:app --reload --port 8000

web: ## Run the website on :5173 (talks to the API on :8000)
	cd web && npm run dev

test: ## Run every test, lint and type check
	cd api && uv run ruff check . && uv run pytest -q
	cd web && npm run typecheck && npm test

build: ## Build the website into web/dist (the API then serves it on :8000)
	cd web && npm run build

revision: ## New migration after changing models: make revision m="add tea photos"
	cd api && uv run alembic revision --autogenerate -m "$(m)"

up: ## Run the production image with Postgres via Docker on :8000
	docker compose up --build
