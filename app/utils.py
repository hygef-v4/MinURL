BASE62_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

def encode_base62(num: int ) -> str:
    if num == 0:
        return BASE62_ALPHABET[0]
    arr = []
    while num: 
        num, rem = divmod(num, 62)
        arr.append(BASE62_ALPHABET[rem])
    arr.reverse()
    return "".join(arr)

def decode_base62(s: str) -> int:
    num = 0
    for char in s: 
        num = num * 62 + BASE62_ALPHABET.index(char)
    return num
