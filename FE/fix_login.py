import re
import os

path = r'd:\MiniERP_NhomKinh\FE\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Chunk 1: Background
c1_old = '''        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
          <Image
            src="/login_bg_structure.png"
            alt="Nhôm Kính Chí Thành 3D Facade Background"
            fill
            className="object-cover opacity-85 contrast-[1.05] brightness-[0.85]"
            priority
          />
          {/* Lớp gradient mờ tăng tương phản cho form đăng nhập */}
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/50 z-0" />
        </div>'''
c1_new = '''        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
          <Image
            src="/login_bg_silver.jpg"
            alt="Nhôm Kính Chí Thành 3D Facade Background"
            fill
            className="object-cover opacity-85 contrast-[1.05] brightness-[0.85]"
            priority
          />
          {/* Lớp gradient mờ tăng tương phản cho form đăng nhập */}
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/50 z-0" />
          {/* Che ngôi sao ở góc dưới phải của ảnh gốc */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-zinc-950/95 blur-2xl z-0 rounded-full pointer-events-none" />
        </div>'''
content = content.replace(c1_old, c1_new)

# Chunk 2: Top Logo SVG
c2_pattern = r'<div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 drop-shadow-\[0_4px_12px_rgba\(56,189,248,0\.15\)\] group-hover/brand:drop-shadow-\[0_4px_20px_rgba\(56,189,248,0\.35\)\] group-hover/brand:scale-105 transition-all duration-300">.*?</svg>\n            </div>'
c2_new = '''<div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_4px_12px_rgba(56,189,248,0.15)] group-hover/brand:drop-shadow-[0_4px_20px_rgba(56,189,248,0.35)] group-hover/brand:scale-105 transition-all duration-300">
              <Image src="/logo_silver.png" alt="Nhôm Kính Chí Thành Logo" fill className="object-contain" />
            </div>'''
content = re.sub(c2_pattern, c2_new, content, flags=re.DOTALL)

# Chunk 3: Card Logo SVG
c3_pattern = r'<div className="w-16 h-16 rounded-2xl bg-linear-to-b from-zinc-900 to-zinc-950 border border-white/10 flex items-center justify-center shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.1\),0_8px_20px_rgba\(0,0,0,0\.6\)\] mb-3 hover:scale-105 transition-transform duration-300\">\n                <svg className="w-11 h-11".*?</svg>\n              </div>'
c3_new = '''<div className="relative w-16 h-16 rounded-2xl bg-linear-to-b from-zinc-900 to-zinc-950 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.6)] mb-3 hover:scale-105 transition-transform duration-300 overflow-hidden">
                <Image src="/logo_silver.png" alt="Logo" fill className="object-contain p-1.5" />
              </div>'''
content = re.sub(c3_pattern, c3_new, content, flags=re.DOTALL)

# Chunk 4: Footer
c4_old = '''            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>'''
c4_new = '''            <a href="#" className="text-slate-300 hover:text-white font-semibold transition-colors">Privacy</a>
            <a href="#" className="text-slate-300 hover:text-white font-semibold transition-colors">Terms</a>'''
content = content.replace(c4_old, c4_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Replacement complete!')
