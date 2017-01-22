export function loadFile(path, callback) {
	fetch(path, { mode:'cors' })
	.then(response => response.text())
	.then(text => callback(text));
}
