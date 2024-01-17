# Introduction

- 遵循swagger2.0规范
- 支持swagger文档导出TS类型
- 支持批量导出类型
- 支持自定义导出目录地址

# [npmLink](https://www.npmjs.com/package/@nanxiaodi/swagger2ts)

# Usage

- Install with npm:

```shell
   npm i -g swaggertoTs
```

- Install with pnpm:

```shell
  pnpm i -g swaggertoTs
```

- Install with yarn:

```shell
  yarn i -g swaggertoTs
```

- cogfig
  - 在项目根目录建立swgToTs.config.json文件
  ```json
  {
    "urls": [/**  swaggerJSON文档地址*/ "http://example/.../api-docs"],
    "output": "./types" /** 输出TS类型目录地址 */
  }
  ```
- 项目package.json配置运行命令
  ```
    ...
         "scripts": {
             "swaggertoTs": "swaggertoTs"
         }
    ...
  ```
