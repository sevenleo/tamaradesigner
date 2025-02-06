import os
import json
import re
import unicodedata
import datetime
import shutil

def normalize_filename(nome):
    # Remove espaços extras do começo e do fim e colapsa espaços internos
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

def safe_rename(src, dst):
    """
    Renomeia src para dst tratando sistemas case-insensitive.
    Se a única diferença for a capitalização, utiliza um nome temporário.
    """
    if os.path.normcase(src) == os.path.normcase(dst) and src != dst:
        temp = src + "_temp_rename"
        os.rename(src, temp)
        os.rename(temp, dst)
    else:
        os.rename(src, dst)

def merge_directories(src, dst):
    """
    Mescla o conteúdo da pasta src na pasta dst.
    Se ocorrer conflito de arquivos, renomeia o arquivo de src com a data atual.
    Se houver conflito de subpastas, mescla-as recursivamente.
    Ao final, remove a pasta src.
    """
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            if os.path.exists(d):
                # Mescla as subpastas
                merge_directories(s, d)
            else:
                os.rename(s, d)
        else:
            # É um arquivo
            if os.path.exists(d):
                # Adiciona data ao nome do arquivo
                data_str = datetime.datetime.now().strftime("%Y%m%d")
                base, ext = os.path.splitext(item)
                new_item = f"{base}_{data_str}{ext}"
                d = os.path.join(dst, new_item)
            os.rename(s, d)
    # Tenta remover a pasta src, se estiver vazia
    try:
        os.rmdir(src)
    except Exception as e:
        print(f"Não foi possível remover o diretório {src}: {e}")

def renomear_arquivos_e_pastas(caminho_raiz):
    # topdown=False para renomear de baixo para cima
    for raiz, dirs, arquivos in os.walk(caminho_raiz, topdown=False):
        # Renomeia arquivos
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                nome_base, extensao = os.path.splitext(arquivo)
                novo_nome_base = normalize_filename(nome_base)
                novo_nome = novo_nome_base + extensao.lower()
                if arquivo != novo_nome:
                    caminho_antigo = os.path.join(raiz, arquivo)
                    caminho_novo = os.path.join(raiz, novo_nome)
                    # Se o arquivo destino já existir, acrescenta a data atual
                    if os.path.exists(caminho_novo):
                        data_str = datetime.datetime.now().strftime("%Y%m%d")
                        novo_nome = novo_nome_base + "_" + data_str + extensao.lower()
                        caminho_novo = os.path.join(raiz, novo_nome)
                    try:
                        safe_rename(caminho_antigo, caminho_novo)
                        print(f"Renomeado arquivo: {arquivo} -> {novo_nome}")
                    except Exception as e:
                        print(f"Erro ao renomear arquivo {arquivo}: {e}")
        # Renomeia pastas
        for i, pasta in enumerate(dirs):
            novo_nome = normalize_filename(pasta)
            if pasta != novo_nome:
                caminho_antigo = os.path.join(raiz, pasta)
                caminho_novo = os.path.join(raiz, novo_nome)
                if os.path.exists(caminho_novo):
                    # Se a pasta destino já existir, mescla os conteúdos
                    try:
                        merge_directories(caminho_antigo, caminho_novo)
                        print(f"Mesclada pasta: {pasta} -> {novo_nome}")
                    except Exception as e:
                        print(f"Erro ao mesclar a pasta {pasta}: {e}")
                    # Atualiza o nome na lista de diretórios
                    dirs[i] = novo_nome
                else:
                    try:
                        safe_rename(caminho_antigo, caminho_novo)
                        print(f"Renomeada pasta: {pasta} -> {novo_nome}")
                        dirs[i] = novo_nome
                    except Exception as e:
                        print(f"Erro ao renomear pasta {pasta}: {e}")

def listar_imagens(caminho_raiz, base_url):
    imagens = []
    for raiz, _, arquivos in os.walk(caminho_raiz):
        for arquivo in arquivos:
            if arquivo.lower().endswith(".png"):
                # Usa barras normais para URL
                caminho_relativo = os.path.relpath(os.path.join(raiz, arquivo), caminho_raiz).replace("\\", "/")
                nome_arquivo = os.path.splitext(arquivo)[0]
                imagens.append({"url": base_url + caminho_relativo, "title": nome_arquivo})
    return imagens

if __name__ == "__main__":
    # Define a pasta 'figurinhas' (deve estar na mesma pasta do script)
    pasta_figurinhas = os.path.join(os.getcwd(), "figurinhas")
    base_url = "https://raw.githubusercontent.com/sevenleo/tamaradesigner/refs/heads/main/figurinhas/"
    
    # Primeiro, renomeia arquivos e pastas
    renomear_arquivos_e_pastas(pasta_figurinhas)
    
    # Em seguida, gera o JSON com as URLs completas
    lista_imagens = listar_imagens(pasta_figurinhas, base_url)
    
    with open("figurinhas.json", "w", encoding="utf-8") as f:
        json.dump(lista_imagens, f, ensure_ascii=False, indent=4)
    
    print("Arquivo 'figurinhas.json' gerado com sucesso!")
