var { createFilter } =require('@rollup/pluginutils');
var { basename } = require('path');

function defaultName(name){
	return name
}
function transformUrl(url){
	return `export default ${url};`
}
module.exports=function(options){
	const defaultOptions={
		publicPath: "",
		emitFileName:defaultName,
		transform:transformUrl,
		include:[/\.mp4$/, /\.mkv$/, /\.mov$/, /\.avi$/, /\.wmv$/, /\.flv$/, /\.f4v$/, /\.hlv$/, /\.webm$/]
	};
	options = Object.assign(defaultOptions,options);
	const filter = createFilter(options.include || defaultOptions.include, options.exclude);
	var assetFiles=[];
	var assetVariables=[];
	return {
		name: 'asset',

		transform(code, id) {
			if (!filter(id)) return null;
			var fileId = this.emitFile({
				type: 'asset',
				name: options.emitFileName(basename(id)),
				source: code
			});
			var variable=`__asset_${fileId}__`;
			assetFiles.push(fileId);
			assetVariables.push(variable);
			return {
				code: options.transform(`import.meta.${variable}`)
			};
		},
		resolveImportMeta(property) {
			var i=assetVariables.indexOf(property);
			if(i>=0){
				var fileName=this.getFileName(assetFiles[i]);
				return JSON.stringify(options.publicPath+fileName);
			}
			return null;
		},
	};
};