import os
import chardet

def scan_files(root="."):
    for dirpath, dirnames, filenames in os.walk(root):
        # 跳过 node_modules 目录
        if "node_modules" in dirnames:
            dirnames.remove("node_modules")

        for f in filenames:
            # 只检测 js、html、vue 文件
            if f.endswith((".js", ".html", ".vue")):
                path = os.path.join(dirpath, f)
                try:
                    with open(path, "rb") as fp:
                        raw = fp.read(4096)  # 只读取前 4KB，加快检测速度
                    result = chardet.detect(raw)
                    encoding = result["encoding"]
                    confidence = result["confidence"]

                    # 只打印非 UTF-8 文件
                    if encoding is None or encoding.lower() != "utf-8":
                        print(f"[非UTF-8] {path} -> 编码: {encoding}, 置信度: {confidence:.2f}")
                except Exception as e:
                    print(f"{path} -> 检测失败: {e}")

if __name__ == "__main__":
    scan_files(".")
