#!/bin/bash

# enable globstar
shopt -s globstar

# $1 = file,
function process {

    if [[ $1 == *"node_modules"* ]]; then
        return
    fi

    echo "uglify $1"
    mkdir -p $(dirname $trialDir/$1)
    uglifyjs $1 -c -m -o $trialDir/$1
}

function absPath {

    if [[ -d "$1" ]]; then
        cd "$1"
        echo "$(pwd -P)"
    else
        cd "$(dirname "$1")"
        echo "$(pwd -P)/$(basename "$1")"
    fi
}

mkdir -p trial
rm -rf trial/*

trialDir=$(absPath trial)

# uglify source codes
for dir in .; do
    for file in $dir/**/*.js; do
        process $file
    done
done

cp package.json trial/package.json
cp README.md trial/README.md
