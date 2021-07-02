const vscode = require("vscode");
const fs = require("fs")
const handler = require('serve-handler');
const http = require('http');
const path = require('path')

const serveParams = {
	root: "",
	port: 8181,
};

const previewFileName = '__preview__.html'
function getpPreviewInnerHTML(sspPath, modelPath) {
	return `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title></title>
	<style>
		* {
			margin: 0;
		}

		html,
		body,
		#view,
		#app {
			width: 100%;
			height: 100%;
		}

		#view {
			position: relative;
		}
	</style>
</head>

<body>

	<div id="view"></div>

	<script src="/${sspPath}"></script>

	<script>

		const ssp = new SoonSpace({
			el: '#view',
			options: {
				showInfo: true
			},
			events: {}
		})

		const sbmInfo = {
			id: 'model',
			url: '/${modelPath}'
		}

		ssp.loadSbm(sbmInfo)
			.then(() => {
				ssp.flyMainViewpoint()
			})

	</script>

</body>

</html>
`
}

function getPanelHtml(port, path) {
	return `<!DOCTYPE html>Î
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Preview</title>
	<style>iframe { position: absolute; right: 0; bottom: 0; left: 0; top: 0; border: 0; background-color: white } </style>
</head>
<body>
	<iframe src="http://127.0.0.1:${port}/${path}" frameBorder="0" width="100%" height="100%" />
</body>
</html>`
}


function previewModelCommandFunc(uri) {

	const modelPath = uri.path
	const currentPath = path.resolve(__dirname)

	const isSbmFile = modelPath.indexOf('.sbm') !== -1
	if (!isSbmFile) return vscode.window.showErrorMessage('该文件不是 sbm 模型！')

	const modelPathArr = modelPath.split('/')
	const currentPathArr = currentPath.split('/')
	const commonPathArr = []

	const forEachArr = modelPathArr.length > currentPathArr.length ? currentPathArr : modelPathArr

	for(let i = 0; i < forEachArr.length; i++) {
		if(modelPathArr[i] === currentPathArr[i]) commonPathArr.push(forEachArr[i])
	}

	const commonPath = commonPathArr.join('/') + '/'
	serveParams.root = commonPath;

	const modelSubPath = modelPath.split(commonPath)[1]
	const currentSubPath = currentPath.split(commonPath)[1]

	const writePreviewHtmlPath = modelPath.slice(0, modelPath.lastIndexOf('/') + 1) + previewFileName
	const servePreviewHtmlPath = modelSubPath.slice(0, modelSubPath.lastIndexOf('/') + 1) + previewFileName

	const serveSspFilePath = currentSubPath + '/lib/ssp.js'

	fs.writeFile(
		writePreviewHtmlPath,
		getpPreviewInnerHTML(serveSspFilePath, modelSubPath),
		function (err) {

			if (err) vscode.window.showErrorMessage(err.message)
			else {

				const server = http.createServer((request, response) => {
					// https://github.com/vercel/serve-handler#options
					return handler(request, response, {
						public: serveParams.root
					});
				})

				function createWebviewPanel() {
					const panel = vscode.window.createWebviewPanel("preview-sbm", previewFileName, vscode.ViewColumn.One, {
						enableScripts: true,
						retainContextWhenHidden: true,
					});

					panel.webview.html = getPanelHtml(serveParams.port, servePreviewHtmlPath)

					panel.onDidDispose(() => server.close())
				}

				server.listen(serveParams.port, createWebviewPanel);

			}

		}
	)

}

const previewModelCommand = vscode.commands.registerCommand('vscode-sbm-preview.previewModel', previewModelCommandFunc)

module.exports = function (context) {

	// 注册命令，可以给命令配置快捷键或者右键菜单
	// 回调函数参数uri：当通过资源管理器右键执行命令时会自动把所选资源URI带过来，当通过编辑器中菜单执行命令时，会将当前打开的文档URI传过来
	context.subscriptions.push(previewModelCommand);

};
