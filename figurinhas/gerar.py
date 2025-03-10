import os
import json
import re
import unicodedata
import datetime
from datetime import datetime
import pytz

def normalize_filename(nome):
    # Lógica de normalização existente
    nome = nome.strip()
    nome = re.sub(r'\s+', ' ', nome)
    nome = nome.lower()
    nome = unicodedata.normalize('NFD', nome)
    nome = nome.encode('ascii', 'ignore').decode("utf-8")
    nome = nome.replace(' ', '_')
    nome = re.sub(r'_+', '_', nome)
    nome = nome.strip('_')
    nome = re.sub(r'-+', '-', nome)
    nome = nome.strip('-')
    return nome

def current_timestamp():
    return datetime.datetime.now().strftime("%Y%m%d%H%M%S")

def safe_rename_file(src, dst):
    # Lógica de renomeação existente
    if os.path.normcase(src) == os.path.normcase(dst) and src != dst:
        temp = src + "_temp_rename"
        os.rename(src, temp)
        src = temp
    if os.path.exists(dst):
        base, ext = os.path.splitext(dst)
        import random
        random_number = random.randint(10, 99)
        dst = f"{base}_{current_timestamp()}{random_number}{ext}"
    os.rename(src, dst)
    return dst

def merge_directories(src, dst):
    # Lógica de mesclagem existente
    for item in os.listdir(src):
        item_src = os.path.join(src, item)
        item_dst = os.path.join(dst, item)
        if os.path.isdir(item_src):
            if os.path.exists(item_dst) and os.path.isdir(item_dst):
                merge_directories(item_src, item_dst)
            else:
                os.rename(item_src, item_dst)
        else:
            if os.path.exists(item_dst):
                base, ext = os.path.splitext(item_dst)
                item_dst = f"{base}_{current_timestamp()}{ext}"
            os.rename(item_src, item_dst)
    os.rmdir(src)

def safe_rename_dir(src, dst):
    # Lógica de renomeação de diretório existente
    if os.path.normcase(src) == os.path.normcase(dst) and src != dst:
        temp = src + "_temp_rename"
        os.rename(src, temp)
        src = temp
    if os.path.exists(dst):
        merge_directories(src, dst)
        return dst
    else:
        os.rename(src, dst)
        return dst

def renomear_arquivos_e_pastas(caminho_raiz):
    # Lógica de renomeação existente
    for raiz, dirs, arquivos in os.walk(caminho_raiz, topdown=False):
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                nome_base, extensao = os.path.splitext(arquivo)
                novo_nome_base = normalize_filename(nome_base)
                novo_nome = novo_nome_base + extensao.lower()
                if arquivo != novo_nome:
                    caminho_antigo = os.path.join(raiz, arquivo)
                    caminho_novo = os.path.join(raiz, novo_nome)
                    try:
                        safe_rename_file(caminho_antigo, caminho_novo)
                        print(f"Renomeado arquivo: {arquivo} -> {novo_nome}")
                    except Exception as e:
                        print(f"Erro ao renomear arquivo {arquivo}: {e}")
        for i, pasta in enumerate(dirs):
            novo_nome = normalize_filename(pasta)
            if pasta != novo_nome:
                caminho_antigo = os.path.join(raiz, pasta)
                caminho_novo = os.path.join(raiz, novo_nome)
                try:
                    safe_rename_dir(caminho_antigo, caminho_novo)
                    print(f"Renomeada pasta: {pasta} -> {novo_nome}")
                    dirs[i] = novo_nome
                except Exception as e:
                    print(f"Erro ao renomear pasta {pasta}: {e}")

def listar_imagens(caminho_raiz, base_url):
    tz = pytz.timezone('America/Sao_Paulo')
    imagens = []
    for raiz, _, arquivos in os.walk(caminho_raiz):
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                caminho_completo = os.path.join(raiz, arquivo)
                caminho_relativo = os.path.relpath(caminho_completo, caminho_raiz).replace("\\", "/")
                nome_arquivo = os.path.splitext(arquivo)[0]

                # Ignorar arquivos com sufixo "_"
                if nome_arquivo.endswith("#"):
                    continue

                # Inicializar campos opcionais
                promote = None
                premium = False

                # Extrair promote
                promote_match = re.search(r'!(\d+)$', nome_arquivo)
                if promote_match:
                    promote = int(promote_match.group(1))
                    nome_arquivo = nome_arquivo[:promote_match.start()]

                # Verificar premium
                if "~" in nome_arquivo:
                    premium = True
                    nome_arquivo = nome_arquivo.replace("~", " ")

                # Obter timestamp de modificação
                recent = int(os.path.getmtime(caminho_completo))

                # Substituir sublinhado por espaço
                nome_arquivo = nome_arquivo.replace("_", " ")

                # Criar objeto da imagem
                image_obj = {
                    "url": base_url + caminho_relativo,
                    "title": nome_arquivo,
                    "recent": recent  # Adiciona recent como obrigatório
                }

                # Adicionar campos opcionais
                if promote is not None:
                    image_obj["promote"] = promote
                if premium:
                    image_obj["premium"] = premium

                imagens.append(image_obj)

    # Função de ordenação personalizada
    def sort_key(image):
        promote_val = image.get('promote')
        if promote_val is not None:
            return (0, promote_val)
        favorite_val = image.get('favorite')
        if favorite_val is not None:
            return (1, -favorite_val)
        likes_val = image.get('likes')
        if likes_val is not None:
            return (2, -likes_val)
        recent_val = image.get('recent')
        if recent_val is not None:
            return (3, -recent_val)
        return (4, imagens.index(image))  # Mantém ordem original

    # Ordenar as imagens
    sorted_imagens = sorted(imagens, key=sort_key)
    data = {
        "lastModified": datetime.now(tz).isoformat(),
        "images": sorted_imagens
    }
    return data

if __name__ == "__main__":
    pasta_figurinhas = os.path.join(os.getcwd(), "imagens")
    base_url = "https://raw.githubusercontent.com/sevenleo/tamaradesigner/refs/heads/main/figurinhas/imagens/"
    
    renomear_arquivos_e_pastas(pasta_figurinhas)
    
    lista_imagens = listar_imagens(pasta_figurinhas, base_url)
    
    with open("figurinhas.json", "w", encoding="utf-8") as f:
        json.dump(lista_imagens, f, ensure_ascii=False, indent=4)
    
    print("Arquivo 'figurinhas.json' gerado com sucesso!")