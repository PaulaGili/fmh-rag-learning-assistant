setup:
	pip install -r backend/requirements.txt
	pip install -r backend/requirements-dev.txt
	pip install -r scripts/requirements.txt
	npm install

backend:
	cd backend && uvicorn main:app --reload

frontend:
	npm run dev

pipeline:
	cd scripts && python 01_parse_pdfs.py
	cd scripts && python 02_parse_quizzes.py
	cd scripts && python 03_generate_embeddings.py
	cd scripts && python 04_generate_quizzes.py
	cd scripts && python 05_generate_flashcards.py
	cd scripts && python 06_generate_explanations.py
	cd scripts && python 07_translate_content.py

test-backend:
	cd backend && python -m pytest test_rag.py test_main.py -v

test-frontend:
	npm test

test: test-backend test-frontend

eval:
	cd scripts && python eval_rag.py

docker-build:
	docker build -f backend/Dockerfile -t fmh-backend .

docker-run:
	docker run -p 8000:7860 --env-file .env.local -e FRONTEND_URL=http://localhost:3000 fmh-backend

.PHONY: setup backend frontend pipeline eval docker-build docker-run
