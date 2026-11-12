import hashlib
import math
import struct
from pathlib import Path
from typing import Optional

DEFAULT_BLOOM_PATH = Path(__file__).resolve().parent.parent / "assets" / "rolls.bf"


class BloomFilter:
    def __init__(self, size_bits: int, num_hashes: int, bits: Optional[bytearray] = None):
        self.size_bits = size_bits
        self.num_hashes = num_hashes
        self.bits = bits if bits is not None else bytearray((size_bits + 7) // 8)

    @classmethod
    def create(cls, capacity: int = 10_000, fpr: float = 0.01) -> "BloomFilter":
        m = math.ceil(-(capacity * math.log(fpr)) / (math.log(2) ** 2))
        k = max(1, math.ceil((m / capacity) * math.log(2)))
        return cls(m, k)

    def _positions(self, item: str) -> list[int]:
        normalized = item.strip().upper().encode("utf-8")
        digest = hashlib.blake2b(normalized, digest_size=16).digest()
        h1, h2 = struct.unpack(">QQ", digest)
        return [(h1 + i * h2) % self.size_bits for i in range(self.num_hashes)]

    def add(self, item: str) -> None:
        for pos in self._positions(item):
            self.bits[pos >> 3] |= 1 << (pos & 7)

    def might_contain(self, item: str) -> bool:
        return all((self.bits[pos >> 3] >> (pos & 7)) & 1 for pos in self._positions(item))

    def save(self, path: Path = DEFAULT_BLOOM_PATH) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(struct.pack(">II", self.size_bits, self.num_hashes) + self.bits)

    @classmethod
    def load(cls, path: Path = DEFAULT_BLOOM_PATH) -> "BloomFilter":
        raw = path.read_bytes()
        size_bits, num_hashes = struct.unpack(">II", raw[:8])
        return cls(size_bits, num_hashes, bytearray(raw[8:]))

def load_roll_bloom(path: Path = DEFAULT_BLOOM_PATH) -> Optional[BloomFilter]:
    if not path.exists():
        return None
    return BloomFilter.load(path)
