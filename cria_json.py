import os
import json
import re
import unicodedata
import datetime

def normalize_filename(nome):
    # Remove espaços em excesso do começo e fim, e colapsa espaços internos
    nome = nome.strip()
    nome = re.sub(r'\s+', ' ', nome)
    # Converte para minúsculas
    nome = nome.lower()
    # Remove acentuação
    nome = unicodedata.normalize('NFD', nome)
    nome = nome.encode('ascii', 'ignore').decode("utf-8")
    # Substitui espaços por underline
    nome = nome.replace(' ', '_')
    # Colapsa múltiplos underlines para um único
    nome = re.sub(r'_+', '_', nome)
    # Remove underlines do começo e fim
    nome = nome.strip('_')
    # Colapsa múltiplos hífens para um único
    nome = re.sub(r'-+', '-', nome)
    # Remove hífens do começo e do final
    nome = nome.strip('-')
    return nome

def current_timestamp():
    return datetime.datetime.now().strftime("%Y%m%d%H%M%S")

def safe_rename_file(src, dst):
    """
    Renomeia um arquivo. Se src e dst diferirem apenas em capitalização, utiliza um nome temporário.
    Se o arquivo de destino já existir, adiciona um timestamp ao nome.
    Retorna o caminho final do arquivo.
    """
    # Caso apenas a capitalização seja diferente
    if os.path.normcase(src) == os.path.normcase(dst) and src != dst:
        temp = src + "_temp_rename"
        os.rename(src, temp)
        src = temp
    # Se o destino já existir, adiciona timestamp
    if os.path.exists(dst):
        base, ext = os.path.splitext(dst)
        import random
        random_number = random.randint(10, 99)
        dst = f"{base}_{current_timestamp()}{random_number}{ext}"
    os.rename(src, dst)
    return dst

def merge_directories(src, dst):
    """
    Mescla o conteúdo da pasta src na pasta dst.
    Para cada arquivo, se já existir em dst, acrescenta um timestamp ao nome.
    Para subpastas, mescla recursivamente.
    Ao final, remove a pasta src.
    """
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
    """
    Renomeia uma pasta. Se src e dst diferirem apenas em capitalização, utiliza um nome temporário.
    Se a pasta de destino já existir, mescla os conteúdos.
    Retorna o caminho final da pasta.
    """
    if os.path.normcase(src) == os.path.normcase(dst) and src != dst:
        temp = src + "_temp_rename"
        os.rename(src, temp)
        src = temp
    if os.path.exists(dst):
        # Mescla as pastas
        merge_directories(src, dst)
        return dst
    else:
        os.rename(src, dst)
        return dst

def renomear_arquivos_e_pastas(caminho_raiz):
    # topdown=False para renomear primeiro os arquivos e depois as pastas (de baixo para cima)
    for raiz, dirs, arquivos in os.walk(caminho_raiz, topdown=False):
        # Renomeia arquivos
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                nome_base, extensao = os.path.splitext(arquivo)
                novo_nome_base = normalize_filename(nome_base)
                novo_nome = novo_nome_base + extensao.lower()  # garante extensão em minúsculo
                if arquivo != novo_nome:
                    caminho_antigo = os.path.join(raiz, arquivo)
                    caminho_novo = os.path.join(raiz, novo_nome)
                    try:
                        safe_rename_file(caminho_antigo, caminho_novo)
                        print(f"Renomeado arquivo: {arquivo} -> {novo_nome}")
                    except Exception as e:
                        print(f"Erro ao renomear arquivo {arquivo}: {e}")
        # Renomeia pastas
        for i, pasta in enumerate(dirs):
            novo_nome = normalize_filename(pasta)
            if pasta != novo_nome:
                caminho_antigo = os.path.join(raiz, pasta)
                caminho_novo = os.path.join(raiz, novo_nome)
                try:
                    safe_rename_dir(caminho_antigo, caminho_novo)
                    print(f"Renomeada pasta: {pasta} -> {novo_nome}")
                    dirs[i] = novo_nome  # atualiza a lista para manter a consistência
                except Exception as e:
                    print(f"Erro ao renomear pasta {pasta}: {e}")

# def listar_imagens(caminho_raiz, base_url):
#     imagens = []
#     for raiz, _, arquivos in os.walk(caminho_raiz):
#         for arquivo in arquivos:
#             if arquivo.lower().endswith(".png"):
#                 # Converte o caminho para usar barras normais
#                 caminho_relativo = os.path.relpath(os.path.join(raiz, arquivo), caminho_raiz).replace("\\", "/")
#                 nome_arquivo = os.path.splitext(arquivo)[0]
#                 imagens.append({"url": base_url + caminho_relativo, "title": nome_arquivo})
#     return imagens

def listar_imagens(caminho_raiz, base_url):
    imagens = []
    for raiz, _, arquivos in os.walk(caminho_raiz):
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                # Converte o caminho para usar barras normais
                caminho_relativo = os.path.relpath(os.path.join(raiz, arquivo), caminho_raiz).replace("\\", "/")
                nome_arquivo = os.path.splitext(arquivo)[0]
                image_obj = {"url": base_url + caminho_relativo, "title": nome_arquivo}
                imagens.append(image_obj)
    return {"images": imagens}


if __name__ == "__main__":
    # Define a pasta 'figurinhas' que deve estar na mesma pasta do script
    pasta_figurinhas = os.path.join(os.getcwd(), "figurinhas")
    base_url = "https://raw.githubusercontent.com/sevenleo/tamaradesigner/refs/heads/main/figurinhas/"
    
    # Primeiro, renomeia arquivos e pastas para nomes compatíveis com a web
    renomear_arquivos_e_pastas(pasta_figurinhas)
    
    # Em seguida, gera o JSON com as URLs completas
    lista_imagens = listar_imagens(pasta_figurinhas, base_url)
    
    with open("figurinhas.json", "w", encoding="utf-8") as f:
        json.dump(lista_imagens, f, ensure_ascii=False, indent=4)
    
    print("Arquivo 'figurinhas.json' gerado com sucesso!")
