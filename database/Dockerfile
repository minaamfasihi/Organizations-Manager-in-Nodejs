FROM mysql:5.7

ENV MYSQL_DATABASE=pipedrive \
	MYSQL_ROOT_PASSWORD=pipedrive

COPY ./init_db.sql /docker-entrypoint-initdb.d/
