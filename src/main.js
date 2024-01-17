const { generateApi } = require('swagger-typescript-api');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const generateApiFromConfigFile = async () => {
  try {
    const configPath = path.join(process.cwd(), 'swgToTs.config.json');
    let config = {}
    if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath);
        config = JSON.parse(configFile);
    } else {
        throw new Error('Config file not found.');
    }
    // 从 $ref 引用中提取类型名称
    const getTypeFromRef = (ref) => {
      if (!ref) {
        return 'any';
      }
      const parts = ref.split('/');
      return parts[parts.length - 1];
    };

    // 将 PascalCase 或 camelCase 转换为 kebab-case
    const convertToKebabCase = (str) => {
      if (str === null || str === undefined || str === '') {
        return '';
      }
      return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase()
        .replace(/-+$/, ''); // 移除末尾的 '-'
    };

    // 将字符串转换为 CamelCase 并去除下划线
    const convertToCamelCase = (str) => {
      if (str === null || str === undefined || str === '') {
        return '';
      }
      return str.replace(/(_\w)/g, (m) => m[1].toUpperCase()).replace(/_/g, '');
    };

    // 异步处理每个 URL
    const processUrl = async (url) => {
      try {
        await generateApi({
          url: url,
          output: path.resolve(process.cwd(), config.output),
          template: 'typescript-axios',
          modular: true, // 为客户端、数据类型和路由生成单独的文件
          cleanOutput: false, //清除输出目录
          enumNamesAsValues: false,
          moduleNameFirstTag: true,
          generateUnionEnums: false,
          extractRequestBody: true, // 生成请求体类型
          extractRequestParams: true, //提取请求参数,将路径参数和查询参数合并到一个对象中
          unwrapResponseData: true, // 从响应中展开数据项 res 或 res.data
          toJS: false,
          httpClientType: 'axios', // 可选 'fetch'     //http客户端类型
          defaultResponseAsSuccess: false,
          generateClient: false, //生成http客户端
          generateRouteTypes: false, //生成路由器类型
          generateResponses: true, //生成响应类型
          defaultResponseType: 'void',
          typePrefix: '', // 类型前缀
          typeSuffix: '', // 类型后缀
          enumKeyPrefix: '', // 枚举key前缀
          enumKeySuffix: '', // 枚举key后缀
          addReadonly: false, // 设置只读
          anotherArrayType: false,
          fixInvalidTypeNamePrefix: 'Type', //修复无效类型名称前缀
          fixInvalidEnumKeyPrefix: 'Value', //修复无效枚举键前缀
          hooks: {
            onPreParseSchema: (originalSchema, typeName, schemaType) => {
              if (schemaType === 'object') {
                const properties = originalSchema.properties || {};
                const importSet = new Set(); // 存储所有需要导入的类型
                const requiredProperties = new Set(originalSchema.required || []);
                const entries = Object.entries(properties).map(
                  ([name, def]) => {
                    let tsType;
                    if (def.$ref) {
                      if (def.$ref.includes('InputStream')) {
                        tsType = 'object';
                      } else if (def.$ref.includes('File')) {
                        tsType = 'any';
                      } else {
                        tsType = getTypeFromRef(def.$ref);
                        // 避免自引用类型导致的重复导入
                        if (tsType !== typeName) {
                          importSet.add(tsType); // 添加到导入集合
                        }
                      }
                    } else if (def.type === 'array') {
                      let itemType = def.items.$ref
                        ? getTypeFromRef(def.items.$ref)
                        : def.items.type || 'any';
                      if (def.items.$ref && itemType !== typeName) {
                        importSet.add(itemType); // 如果是引用类型，则添加到导入集合
                      }
                      itemType = itemType === 'integer' ? 'number' : itemType;
                      tsType = `Array<${itemType}>`;
                    } else {
                      // 将 Swagger 的 'integer' 类型转换为 TypeScript 的 'number' 类型
                      tsType =
                        def.type === 'integer' ? 'number' : def.type || 'any';
                    }
                     // 检查属性是否是必需的
                    const isRequired = requiredProperties.has(name);
                    const optionalSign = isRequired ? '' : '?';

                    return [name + optionalSign, tsType, def.description];
                  }
                );

                // 生成导入语句
                const imports = Array.from(importSet)
                  .map(
                    (type) =>
                      `import { ${convertToCamelCase(
                        type
                      )} } from './${convertToKebabCase(type)}';`
                  )
                  .join('\n');
                importSet.clear(); // 清除集合
                const typeDefinition = [
                  '// @ts-nocheck',
                  '/**',
                  ` * ${originalSchema.description}`,
                  ' * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).',
                  ' * https://openapi-generator.tech',
                  ' * Do not edit the class manually.',
                  ' */',
                  '',

                  imports, // 添加导入语句
                  `export interface ${convertToCamelCase(typeName)} {`,
                  ...entries.map(([name, tsType, description]) => {
                    if (name === 'InputStream') {
                      console.log(name, tsType);
                    }
                    return `    /**\n     * ${
                      description || 'No description'
                    }\n     * @type {${tsType}}\n     * @memberof ${convertToCamelCase(
                      typeName
                    )}\n     */\n    ${name}: ${convertToCamelCase(tsType)};`;
                  }),
                  '}',
                ].join('\n');

                const kebabCaseTypeName = convertToKebabCase(typeName);
                const typeFilePath = path.join(
                  path.resolve(process.cwd(), config.output),
                  `${kebabCaseTypeName}.ts`
                );
                fs.writeFileSync(typeFilePath, typeDefinition, 'utf-8');
              }
            },
          },
        });
        console.log(`API client and types generated successfully for ${url}`);
      } catch (error) {
        console.error(
          `Error generating API client and types for ${url}:`,
          error
        );
      }
    };

    const generateIndexFile = () => {
      const files = fs.readdirSync(path.resolve(process.cwd(), config.output));
      const validFiles = files.filter(
        (file) =>
          file.endsWith('.ts') &&
          file !== 'index.ts' &&
          file !== 'data-contracts.ts' &&
          file !== '.ts'
      ); // Exclude deleted files

      const imports = validFiles
        .map((file) => {
          const typeName = path.basename(file, '.ts');
          return `export * from './${typeName}';`;
        })
        .join('\n');

      const indexPath = path.join(
        path.resolve(process.cwd(), config.output),
        'index.ts'
      );
      fs.writeFileSync(indexPath, imports, 'utf-8');
      console.log('index.ts generated successfully.');
    };

    const deleteDataContractFile = () => {
      const files = fs.readdirSync(path.resolve(process.cwd(), config.output));
      files.forEach((file) => {
        if (file === '.ts' || file === 'data-contracts.ts') {
          // Check for unnamed .ts file or data-contracts.ts
          const filePath = path.join(
            path.resolve(process.cwd(), config.output),
            file
          );
          fs.unlinkSync(filePath);
          console.log(`${file} deleted successfully.`);
        }
      });
    };

    // 主函数
    const main = async () => {
      // 清除目录
      fse.emptyDirSync(path.resolve(process.cwd(), config.output));
      for (const url of config.urls) {
        await processUrl(url); // 等待每个 URL 处理完毕
      }
      deleteDataContractFile();
      generateIndexFile();
    };

    // 执行主函数
    main();
    // 现在使用 config 来运行您的逻辑
  } catch (error) {
    console.error('Error loading config file:', error);
  }
};

module.exports = {
    generateApiFromConfigFile
}
