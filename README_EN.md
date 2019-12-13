zos-ui
========

This is a light wallet version connected to the ZOS API. The ZOS API is provided by the zos_node program. This wallet stores all the secret keys on the local browser and will not expose your secret keys to anyone.
It will choose to sign the transaction first, then transmit it to the API server, which will broadcast it to the blockchain network, and the wallet will be encrypted by the user's selected secret key and stored in the browser database.

#Requirements for installation
## One、node system installed：
###If the node system is not yet installed, please download the node installation package for installation；
###If already installed, please ensure it is the latest version, download url：https://nodejs.org/en/ or at: http://nodejs.cn/
##node system detection: 
###Download git and install: https://gitforwindows.org/; 
###Right-click in the blank space of the menu after installation and click `Git Bash Here`, enter` node -v` in the terminal, if it shows the version number, it will indicate that the system has been installed successfully

## Clone project
### Get the project source code https://github.com/zosnet, select the wallet project, select the folder to open the terminal and enter the code:

- git clone https://github.com/zosnet/wallet.git 

- cd wallet

- npm install

### Change app⁩->⁨api⁩->apiConfig-example.js 为 apiConfig.js

### Change app->⁨lib->⁨common->uiconfig-release.json 为 uiconfig.json

### Terminal Input Code:

- npm start

### After compiling, you can access `localhost: 8080` or` 127.0.0.1: 8080` through your browser to open the wallet. The server is hot-loaded, and the content in the browser is updated in real time after editing the source file.

## Test the network
### By default, zos-ui is connected to the normal bitshare network. Switching to a test network running by Xeroc is also easy, and you can select Public Testnet Server in the access point settings of the settings page. If you need to create an account, you also need to modify the tap settings. The address of the test network is https://testnet.zos.eu
Zos-ui refreshes and connects to the test network, you can create an account through the tap and receive some ZOS for testing

## Production interface
### If you want to set up your own wallet, you can build your production environment and host it with NGINX or Apache. Just run the following command to build the production application package:

- npm run build

### The app package is created under the '/dist' directory and can be hosted using a web server

## Installing the wallet
### We use Electron to provide installable wallets that support Windows, macOS and Debian Linux systems, such as Ubuntu. First make sure that the version of Python you installed is 2.7.x, as that is a requirement. On Linux, you need to install the following packages to generate icons:
- sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils

### Each target platform has its own script to build the project:

### Linux / Windows / Mac

- npm run package-deb  

- npm run package-win 

- npm run package-mac

### The UI is compiled with some special modifications for Electron, after which you generate a removable binary file and copy the file to the 'build/binaries' folder

## Code Style Guide
### We use [Airbnb JavaScript Style Guide] (https://github.com/airbnb/javascript) with the following exceptions:
- Strings with double quotes (6.1)
- The end of the extra comma when the array and object declaration are not required (20.2)
- Indent with four spaces (19.1)
- Spaces in braces are not required (19.11)

It is highly recommended to use the word slint to ensure that the code conforms to the uniform style