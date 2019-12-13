zos-ui
========
这是一个连接ZOS API的轻钱包，ZOS API由 zos_node 程序提供，这个钱包将所有的秘钥储存在本地浏览器上，不会把你的秘钥暴露给任何人，因为他会先选择对交易签名，再传输到API服务器上，由服务器广播至区块链网络，钱包由用户选择的秘钥加密并储存在浏览器数据库中。

# 安装项目依赖
##node环境安装：
###如果本机没有安装node运行环境，请下载node 安装包进行安装；
###如果本机已经安装node的运行换，请更新至最新的node 版本；下载地址：https://nodejs.org/en/ 或者 http://nodejs.cn/
##node环境检测：
###下载git并安装，下载地址 https://gitforwindows.org/；
###安装成功后 右键菜单空白处并点击 `Git Bash Here`，在终端输入 `node -v`，如果输出版本号，说明我们安装node 环境成功

## 克隆项目
### 获取项目源代码 https://github.com/zosnet，选择 wallet工程，选择文件夹打开终端输入代码：

- git clone https://github.com/zosnet/wallet.git 

- cd wallet

- npm install

### 修改 app⁩->⁨api⁩->apiConfig-example.js 为 apiConfig.js

### 修改 app->⁨lib->⁨common->uiconfig-release.json 为 uiconfig.json

### 终端输入代码：

- npm start

### 编译完成后，即可通过浏览器访问 `localhost:8080` 或 `127.0.0.1:8080` 打开钱包。服务器启用了热加载功能，在编辑源文件后，浏览器中的内容会实时更新。

## 测试网络
### 默认情况下，zos-ui 会连接到正常比特股网络。切换到 Xeroc 运行的测试网络也很容易，在设置页面的接入点设置中选择 Public Testnet Server 即可。如果你需要创建帐号，你同时需要修改水龙头设置。测试网络的水龙头地址是 https://testnet.zos.eu
### zos-ui 会刷新并连接到测试网络，你可以通过水龙头创建账户并收到一些用于测试的 ZOS

## 生产环境
### 如果你想自己架设钱包，你应该进行生产环境构建，并使用 NGINX 或 Apache 托管。只需要运行以下命令构建生产环境应用包：

- npm run build

### 应用包会创建在 `/dist` 目录下，可以使用网站服务器进行托管

## 可安装钱包
### 我们使用 Electron 提供可安装钱包，支持 Windows, macOS 和 Debian 系 Linux 系统，如 Ubuntu。首先确保你安装的 python 版本为 2.7.x，因为一个依赖要求此版本， 在 Linux 上，你需要安装以下软件包来生成图标：

- sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils

### 每个目标平台都有自己的脚本用来构建项目：
### Linux / Windows / Mac

- npm run package-deb  

- npm run package-win 

- npm run package-mac

### 编译 UI 时将会针对 Electron 做出一些特殊修改，之后生成可安装的二进制文件，并将文件复制到 `build/binaries` 文件夹中

## 代码风格指南
### 我们使用 [Airbnb JavaScript 风格指南](https://github.com/airbnb/javascript)，但有以下例外：

- 字符串使用双引号 (6.1)
- 数组和对象声明时的末尾多余逗号不作要求 (20.2)
- 使用四个空格缩进 (19.1)
- 大括号中的空格不作要求 (19.11)

### 强烈建议使用 _eslint_ 来保证代码符合风格统一