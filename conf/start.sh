#!/bin/bash

# We build the wallet each time we run the docker and it takes a couple of minutes
npm run build

cp -r /zos-ui/build/dist/* /var/www/

nginx -g "daemon off;"
