const vscode = require("vscode");
const fs = require("fs")
const handler = require('serve-handler');
const http = require('http');

const serveParams = {
	root: "",
	port: 8181,
};

module.exports = function (context) {

	// 注册命令，可以给命令配置快捷键或者右键菜单
	// 回调函数参数uri：当通过资源管理器右键执行命令时会自动把所选资源URI带过来，当通过编辑器中菜单执行命令时，会将当前打开的文档URI传过来
	context.subscriptions.push(vscode.commands.registerCommand('vscode-sbm-preview.previewModel', function (uri) {

		const isSbmFile = uri ? uri.path.indexOf('.sbm') !== -1 : false

		if (!isSbmFile) return vscode.window.showErrorMessage('该文件不是 sbm 模型！')

		const splitIndex = uri.path.lastIndexOf('/') + 1

		const servePath = uri.path.slice(0, splitIndex)
		const modelName = uri.path.slice(splitIndex, uri.path.length)

		const htmlFileName = '__previewSbm__.html'

		const html =
	`<!DOCTYPE html>
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

	<script src="https://unpkg.com/soonspacejs/dist/index.js"></script>

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
			url: './${modelName}'
		}

		ssp.loadSbm(sbmInfo)
			.then(() => {
				ssp.flyMainViewpoint()
			})

	</script>

</body>

</html>
`

		fs.writeFile(`${servePath}${htmlFileName}`, html, (err) => {

			if (err) vscode.window.showErrorMessage(err.message)
			else {

				serveParams.root = servePath;

				const server = http.createServer((request, response) => {
					// You pass two more arguments for config and middleware
					// More details here: https://github.com/vercel/serve-handler#options
					return handler(request, response, {
						public: serveParams.root
					});
				})
				
				server.listen(serveParams.port, () => {

					const panel = vscode.window.createWebviewPanel("preview-sbm", "PreviewSbm", 2, {
						enableScripts: true,
						retainContextWhenHidden: true,
					});
					panel.webview.html =
						`<!DOCTYPE html>
					<html lang="en">
					<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<meta http-equiv="X-UA-Compatible" content="ie=edge">
							<title>Preview</title>
							<style>iframe { position: absolute; right: 0; bottom: 0; left: 0; top: 0; border: 0; background-color: white } </style>
					</head>
					<body>
							<iframe src="http://127.0.0.1:${serveParams.port}/${htmlFileName}" frameBorder="0" width="100%" height="100%" />
					</body>
					</html>`

					panel.onDidChangeViewState(() => server.close())

				});
			
			}

		})

	}));

};
