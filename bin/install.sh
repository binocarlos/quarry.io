#!/bin/bash
#
# @(#)$Id$
#
# Quarry.io install script
# 
# Install the base software for running on a machine

##########################################################################################
# shout this!
installlog()
{
  echo "-----------------------------------------------------------"
  echo $1
  echo "-----------------------------------------------------------"
  echo ""
}

# where are we running from
quarryio_home="/srv/quarryio"

# where to download source for compiling
sources_folder="/root/.sources"

##########################################################################################
# This makes a temporary folder for us to download sources ready to compile
installlog "Making Temp Folder /root/.sources"
mkdir -p $sources_folder

##########################################################################################
# This makes sure we have 'basic' packages like a build tool for a start
installlog "Installing Basic Apt Packages"
apt-get install python-software-properties curl -y
apt-get install build-essential -y

##########################################################################################
# Installing Redis via Apt
installlog "Installing Redis 2:1.2.6-1"
apt-get -y install redis-server

##########################################################################################
# Download and make, install ZeroMQ
zeromq_version="3.2.0"
zeromq_file="zeromq-$zeromq_version-rc1.tar.gz"
zeromq_url="http://download.zeromq.org/$zeromq_file"

# Only install ZeroMQ if it is not already installed
if [ ! -d "$sources_folder/zeromq-$zeromq_version" ]; then
	cd $sources_folder
	installlog "Downloading ZeroMQ version: $zeromq_version-rc1"
	curl -C - --progress-bar $zeromq_url -o "$zeromq_file"
	tar -xzf $zeromq_file
	cd "zeromq-$zeromq_version"
	installlog "building zeromq version: $zeromq_version"
	./configure
	make
	make install
else
	installlog "skipping ZeroMQ version: $zeromq_version already installed"	
fi

##########################################################################################
# Download and make, install node.js

#sudo apt-get install python-software-properties
#sudo add-apt-repository ppa:chris-lea/node.js
#sudo apt-get update
#sudo apt-get install nodejs npm

nodejs_version="0.8.8"
nodejs_file="node-v$nodejs_version.tar.gz"
nodejs_url="http://nodejs.org/dist/v$nodejs_version/$nodejs_file"

# Only install node.js if it is not already installed
if [ ! -d "$sources_folder/node-v$nodejs_version" ]; then
	cd $sources_folder
	installlog "downloading node.js version: $nodejs_version"
	curl -C - --progress-bar $nodejs_url -o "$nodejs_file"
	tar -xzf $nodejs_file
	cd "node-v$nodejs_version"
	installlog "building node.js version: $nodejs_version"
	./configure
	make
	make install
else
	installlog "skipping node.js version: $nodejs_version already installed"
fi

##########################################################################################
# Install node.js modules from NPM - this reads ../package.json for dependencies
# The ZeroMQ npm is different - ask the Administrator
if [ ! -d "$quarryio_home/node_modules" ]; then
	installlog "installing node modules"
	cd $quarryio_home
	npm install https://github.com/mscdex/zeromq.node/tarball/master
	ldconfig
	npm install
fi