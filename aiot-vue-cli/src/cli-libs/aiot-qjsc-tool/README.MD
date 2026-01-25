aiot-qjsc-tool是一个通过qjsc工具将js文件预编译成quickjs可直接执行的bin文件的工具

当前只支持在mac和win32上运行

支持的quickjs版本:<br />
20200412,20200705,20200906

使用方法:

安装 <br />
<code>npm install -g aiot-qjsc-tool</code>

使用: <br />
<code>aiot-qjsc -v [版本] -f [编译文件] -b -o [输出位置]</code>

参数说明: <br />
Options: <br />
  -V, --version         output the version number <br />
  -v, --qjs_ver <type>  指定quickjs版本,支持版本:20200412,20200705,20200906 <br />
  -b, --bigNum          是否开启quickjs的bigNum(default: false) <br />
  -f, --file <type>     指定编译的js文件 <br />
  -o, --output [type]   输出文件路径 <br />
  -h, --help            display help for command



