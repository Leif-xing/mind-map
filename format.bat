@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo Git 文件自动格式化工具
echo ========================================
echo.

:: 检查是否在 Git 仓库中
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [错误] 当前目录不是 Git 仓库！
    pause
    exit /b 1
)

:: 检查是否安装了 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js！
    pause
    exit /b 1
)

:: 进入 web 目录（prettier 和 eslint 安装在这里）
cd /d "%~dp0web"

:: 检查是否安装了 prettier
if not exist "node_modules\.bin\prettier.cmd" (
    echo [错误] 未找到 Prettier，请先运行 npm install！
    pause
    exit /b 1
)

:: 检查是否安装了 eslint
if not exist "node_modules\.bin\eslint.cmd" (
    echo [错误] 未找到 ESLint，请先运行 npm install！
    pause
    exit /b 1
)

:: 回到项目根目录
cd /d "%~dp0"

:: 定义代码文件扩展名（用于过滤）
set "CODE_EXTENSIONS=.js .vue .css .less .scss .ts .tsx .json .md"

:: 获取所有修改的文件
echo [信息] 正在获取修改的文件列表...
echo.

set "FILE_COUNT=0"
set "FORMATTED_COUNT=0"

:: 处理 git status --porcelain 输出
:: 格式: XY PATH 或 XY ORIG_PATH -^> NEW_PATH
for /f "tokens=1,* delims= " %%a in ('git status --porcelain 2^>nul') do (
    set "STATUS=%%a"
    set "FILEPATH=%%b"
    
    :: 移除引号
    set "FILEPATH=!FILEPATH:"=!"
    
    :: 处理重命名文件 (R  old -^> new)
    for /f "tokens=1,2,3 delims=->" %%x in ("!FILEPATH!") do (
        if "%%z" neq "" (
            set "FILEPATH=%%z"
            set "FILEPATH=!FILEPATH: =!"
        )
    )
    
    :: 跳过删除的文件 (D 状态)
    set "SKIP=0"
    if "!STATUS:~0,1!" == "D" set "SKIP=1"
    if "!STATUS:~1,1!" == "D" set "SKIP=1"
    
    if "!SKIP!" == "0" (
        :: 检查文件是否存在
        if exist "!FILEPATH!" (
            set "PROCESS_FILE=0"
            
            :: 检查文件扩展名
            for %%e in (%CODE_EXTENSIONS%) do (
                set "EXT=%%e"
                set "FILELEN=0"
                set "EXTLEN=0"
                
                :: 获取文件扩展名
                for %%f in ("!FILEPATH!") do set "FILEEXT=%%~xf"
                
                if /i "!FILEEXT!" == "%%e" (
                    set "PROCESS_FILE=1"
                )
            )
            
            :: 如果是代码文件，进行格式化
            if "!PROCESS_FILE!" == "1" (
                set /a FILE_COUNT+=1
                echo [!FILE_COUNT!] 正在处理: !FILEPATH!
                
                :: 判断文件类型并使用相应的工具
                set "IS_JS_VUE=0"
                for %%f in ("!FILEPATH!") do set "FILEEXT=%%~xf"
                
                if /i "!FILEEXT!" == ".js" set "IS_JS_VUE=1"
                if /i "!FILEEXT!" == ".vue" set "IS_JS_VUE=1"
                if /i "!FILEEXT!" == ".ts" set "IS_JS_VUE=1"
                if /i "!FILEEXT!" == ".tsx" set "IS_JS_VUE=1"
                
                :: 使用 Prettier 格式化
                echo    ^|-- 运行 Prettier...
                cd /d "%~dp0web"
                call npx prettier --write "../!FILEPATH!" 2>nul
                if !errorlevel! == 0 (
                    echo    ^|-- [成功] Prettier 格式化完成
                ) else (
                    echo    ^|-- [失败] Prettier 格式化失败
                )
                
                :: 对 JS/Vue/TS 文件使用 ESLint 修复
                if "!IS_JS_VUE!" == "1" (
                    echo    ^|-- 运行 ESLint...
                    call npx eslint --fix "../!FILEPATH!" 2>nul
                    if !errorlevel! == 0 (
                        echo    ^|-- [成功] ESLint 修复完成
                    ) else (
                        echo    ^|-- [警告] ESLint 修复失败或有警告
                    )
                )
                
                cd /d "%~dp0"
                set /a FORMATTED_COUNT+=1
                echo.
            )
        )
    )
)

echo ========================================
echo 格式化完成！
echo ========================================
echo Scanned   files: !FILE_COUNT!
echo Formatted files: !FORMATTED_COUNT!
echo.
echo [信息] 格式化后的文件状态：
echo.
git status