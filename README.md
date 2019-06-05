# pipedrive

# Installing MYSQL using Docker
- Make a directory for this project and then cd into it (let's call it `pipedrive`)
- Create another directory inside `pipedrive` called `database` and then cd into it (`pipedrive/database`)
- Create a folder called `data` inside `database` by typing `mkdir data`
- Now, from `pipedrive/database`, run `sudo docker build -t pipedrive-db .`
- After the above command is run successfully, run 
`docker run  -d \
--publish 6603:3306 \
--volume=/www/pipedrive/database/data:/var/lib/mysql \
--name=pipedrive-db pipedrive-db`
- After that, make sure that the mysql database is up and running. You can do this by: 
`mysql -u root -p -h 192.xxx.xx.x -P 6603 -D pipedrive`
- If you are connected successfully, it means that your database has been setup successfully using docker

# Installing NodeJS using Docker
- In the first step when installing mysql, we created our parent directory called `pipedrive`.
- Make sure you are inside it. If you were in `pipedrive/database`, you can do `cd ..` so that you are now in `pipedrive`
- It would be better if you could do this in a new terminal so that you have multiple terminals corresponding to different containers.

- Run `docker build -t pipedrive-nodejs .`
- Run this for detached mode,
`docker run  -d \
--publish 4000:4000 \
-e MYSQL_USER='root' \
-e MYSQL_PASSWORD='pipedrive' \
-e MYSQL_DATABASE='pipedrive' \
-e MYSQL_HOST='172.17.0.2' \
--link pipedrive-db:db \
--name=pipedrive-nodejs pipedrive-nodejs
`
or if you don't want to run it in detached mode, then do:
`docker run \
--publish 4000:4000 \
-e MYSQL_USER='root' \
-e MYSQL_PASSWORD='pipedrive' \
-e MYSQL_DATABASE='pipedrive' \
-e MYSQL_HOST='172.17.0.2' \
--link pipedrive-db:db \
--name=pipedrive-nodejs pipedrive-nodejs
`

Once you have successfully completed all the above steps, you can now test the code.
Entire backend code is in `server.js`.

# API Endpoints
- GET `localhost:4000?page=1`


Body: 
`{
	"org_name": "Black Banana"
}`

Response:
`
{
    "response": [
        {
            "relationship_type": "parent",
            "org_name": "Banana tree"
        },
        {
            "relationship_type": "parent",
            "org_name": "Big banana tree"
        },
        {
            "relationship_type": "sister",
            "org_name": "Brown Banana"
        },
        {
            "relationship_type": "sister",
            "org_name": "Green Banana"
        },
        {
            "relationship_type": "daughter",
            "org_name": "Phoneutria Spider"
        },
        {
            "relationship_type": "sister",
            "org_name": "Yellow Banana"
        }
    ]
}
`


- POST `localhost:4000`


Body: 
`
{
    "org_name": "Paradise Island",
    "daughters": [
        {
            "org_name": "Banana tree",
            "daughters": [
                {
                    "org_name": "Yellow Banana"
                },
                {
                    "org_name": "Brown Banana"
                },
                {
                    "org_name": "Black Banana"
                }
            ]
        },
        {
            "org_name": "Big banana tree",
            "daughters": [
                {
                    "org_name": "Yellow Banana"
                },
                {
                    "org_name": "Brown Banana"
                },
                {
                    "org_name": "Green Banana"
                },
                {
                    "org_name": "Black Banana",
                    "daughters": [
                        {
                            "org_name": "Phoneutria Spider"
                        }
                    ]
                }
            ]
        }
    ]
}
`

Response:
`
{
    "success": true,
    "message": "success"
}
`
