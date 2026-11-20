def gen_svg():
    svg = []
    svg.append('<svg class="map-scenery" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">')
    svg.append('  <defs>')
    svg.append('    <linearGradient id="grass-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2e25"/><stop offset="1" stop-color="#121e18"/></linearGradient>')
    svg.append('    <linearGradient id="path-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d5360"/><stop offset="1" stop-color="#3c4350"/></linearGradient>')
    svg.append('    <linearGradient id="roof-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#314070"/><stop offset="1" stop-color="#1f2947"/></linearGradient>')
    svg.append('    <linearGradient id="roof-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f42"/><stop offset="1" stop-color="#1a1d2e"/></linearGradient>')
    svg.append('    <linearGradient id="wall-warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebd7ba"/><stop offset="1" stop-color="#d3c2a8"/></linearGradient>')
    svg.append('    <linearGradient id="wall-tech" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a4b3cc"/><stop offset="1" stop-color="#8090b0"/></linearGradient>')
    svg.append('    <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>')
    svg.append('    <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#070a1a" flood-opacity="0.6"/></filter>')
    svg.append('    <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="15" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>')
    svg.append('  </defs>')
    svg.append('  <rect width="1000" height="700" fill="url(#grass-fill)"/>')
    svg.append('  <path d="M500,105 L500,630" stroke="url(#path-fill)" stroke-width="24" stroke-linecap="round"/>')
    svg.append('  <path d="M250,210 L750,210" stroke="url(#path-fill)" stroke-width="20" stroke-linecap="round"/>')
    svg.append('  <path d="M300,385 L700,385" stroke="url(#path-fill)" stroke-width="20" stroke-linecap="round"/>')
    svg.append('  <circle cx="500" cy="210" r="45" fill="url(#path-fill)"/>')
    svg.append('  <circle cx="500" cy="476" r="40" fill="url(#path-fill)"/>')
    svg.append('  <circle cx="500" cy="210" r="15" fill="url(#water-fill)" stroke="#d3c2a8" stroke-width="2"/>')
    svg.append('  <circle cx="500" cy="210" r="8" fill="#60a5fa"/>')

    def draw_building(cx, cy, width, depth, height, roof_color, wall_color, has_windows=True):
        res = []
        res.append(f'<rect x="{cx - width/2}" y="{cy - depth/2}" width="{width}" height="{depth + height}" fill="#0b1026" opacity="0.6" filter="url(#drop-shadow)"/>')
        res.append(f'<rect x="{cx - width/2}" y="{cy - depth/2 + height/2}" width="{width}" height="{depth}" fill="url(#{wall_color})"/>')
        if has_windows:
            w_w = 6
            w_h = 10
            gap = 12
            start_x = cx - width/2 + 10
            num_w = int((width - 20) / gap)
            for i in range(num_w):
                res.append(f'<rect x="{start_x + i*gap}" y="{cy - depth/2 + height/2 + depth/2 - w_h/2}" width="{w_w}" height="{w_h}" fill="#f4c95d" rx="2"/>')
        res.append(f'<rect x="{cx - width/2 - 4}" y="{cy - depth/2 - 20}" width="{width + 8}" height="{depth}" fill="url(#{roof_color})"/>')
        res.append(f'<rect x="{cx - width/2 - 4}" y="{cy + depth/2 - 20}" width="{width + 8}" height="4" fill="#1f2947"/>')
        res.append(f'<path d="M{cx - 10},{cy + depth/2 + height/2} L{cx - 10},{cy + depth/2 + height/2 - 15} Q{cx},{cy + depth/2 + height/2 - 20} {cx + 10},{cy + depth/2 + height/2 - 15} L{cx + 10},{cy + depth/2 + height/2} Z" fill="#2a2f42"/>')
        return "".join(res)

    def draw_tree(cx, cy):
        return f'<g filter="url(#drop-shadow)"><circle cx="{cx}" cy="{cy}" r="15" fill="#2d4a34"/><circle cx="{cx-3}" cy="{cy-3}" r="10" fill="#466f4e"/></g>'

    svg.append(draw_building(500, 65, 120, 40, 20, "roof-blue", "wall-warm"))
    svg.append('<text x="500" y="55" fill="#60a5fa" font-size="20" font-family="sans-serif" text-anchor="middle" filter="url(#glow-purple)">📖</text>')
    svg.append(draw_building(650, 40, 60, 60, 40, "roof-dark", "wall-tech"))
    svg.append(draw_building(250, 150, 140, 50, 20, "roof-blue", "wall-warm"))
    svg.append(draw_building(750, 150, 110, 50, 25, "roof-dark", "wall-tech"))
    svg.append('<rect x="710" y="160" width="80" height="2" fill="#8b5cf6" filter="url(#glow-purple)"/>')
    svg.append(draw_building(500, 254, 100, 40, 20, "roof-blue", "wall-warm"))
    svg.append(draw_building(300, 325, 160, 60, 20, "roof-blue", "wall-warm"))
    svg.append(draw_building(500, 345, 80, 40, 15, "roof-dark", "wall-warm"))
    svg.append('<circle cx="470" cy="370" r="4" fill="#d3c2a8"/>')
    svg.append('<circle cx="530" cy="370" r="4" fill="#d3c2a8"/>')
    svg.append(draw_building(700, 325, 120, 60, 25, "roof-dark", "wall-tech"))
    svg.append('<text x="700" y="320" fill="#f4c95d" font-size="24" text-anchor="middle" filter="url(#glow-purple)">🎮</text>')

    for x, y in [(470, 440), (530, 440), (450, 470), (550, 470), (480, 480), (520, 480), (500, 430)]:
        svg.append(draw_tree(x, y))
    svg.append('<circle cx="500" cy="460" r="25" fill="#8b5cf6" opacity="0.3" filter="url(#glow-purple)"/>')
    svg.append('<circle cx="500" cy="460" r="5" fill="#8b5cf6" filter="url(#glow-purple)"/>')

    svg.append('<rect x="350" y="520" width="300" height="120" rx="60" fill="#2d4a34" stroke="#d3c2a8" stroke-width="4" filter="url(#drop-shadow)"/>')
    svg.append('<rect x="370" y="530" width="260" height="100" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.5"/>')
    svg.append('<line x1="500" y1="530" x2="500" y2="630" stroke="#ffffff" stroke-width="2" stroke-opacity="0.5"/>')
    svg.append('<circle cx="500" cy="580" r="15" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.5"/>')

    svg.append('<rect x="440" y="660" width="120" height="20" fill="url(#path-fill)"/>')
    svg.append('<rect x="440" y="620" width="20" height="40" fill="url(#roof-dark)"/>')
    svg.append('<rect x="540" y="620" width="20" height="40" fill="url(#roof-dark)"/>')
    svg.append('<rect x="440" y="610" width="120" height="15" fill="url(#roof-blue)"/>')

    trees = [(150, 150), (120, 250), (200, 270), (850, 150), (880, 280), (800, 260), (350, 100), (650, 250), (200, 450), (250, 480), (800, 450), (750, 480), (300, 600), (700, 600)]
    for x, y in trees:
        svg.append(draw_tree(x, y))

    svg.append('<circle class="ambient-spark spark-one" cx="480" cy="190" r="3"/>')
    svg.append('<circle class="ambient-spark spark-two" cx="280" cy="180" r="2.5"/>')
    svg.append('<circle class="ambient-spark spark-three" cx="720" cy="400" r="3"/>')
    svg.append('<circle class="ambient-spark spark-four" cx="500" cy="460" r="4"/>')

    svg.append('</svg>')
    
    with open("d:/CampusQuest/svg_out.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(svg))

gen_svg()
