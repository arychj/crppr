.PHONY: test test-build up down

IMAGE_TEST := crppr-test

test-build:
	docker build -f Dockerfile.test -t $(IMAGE_TEST) .

test: test-build
	docker run --rm $(IMAGE_TEST)

up:
	docker compose up -d

down:
	docker compose down
