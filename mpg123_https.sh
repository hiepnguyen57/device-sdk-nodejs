#!/bin/bash

# play https url using mpg123

function https_url_p ()
{
	local url=$1
	echo $url | egrep "^https://" > /dev/null
}

uri=$1
if https_url_p $uri;then
	curl -L $uri | mpg123 -
else
	mpg123 $curi
fi