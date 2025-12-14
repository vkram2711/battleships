import React, { useMemo } from 'react';

interface CellProps {
    row: number;
    col: number;
    value: string;
    onClick: (row: number, col: number) => void;
    disabled?: boolean;
    showShips?: boolean;
    highlight?: { result: 'hit' | 'miss' } | null;
}

/**
 * Cell with "shell landing" animation:
 * - entire cell has a shell-drop animation class when highlighted
 * - an impact ring element animates with impact-ring
 * - a few debris spans fly out using CSS custom props (--dx, --dy)
 * - symbol (💥 / •) pops with symbol-pop animation
 *
 * Debris positions are randomized per render to feel organic.
 */
const Cell: React.FC<CellProps> = ({
                                       row,
                                       col,
                                       value,
                                       onClick,
                                       disabled = false,
                                       showShips = false,
                                       highlight = null,
                                   }) => {
    const isHighlighted = !!highlight;
    const isHit = isHighlighted && highlight!.result === 'hit';
    const isMiss = isHighlighted && highlight!.result === 'miss';

    // base background
    const baseBg = (() => {
        if (value === 'X') return 'bg-red-500';
        if (value === 'O') return 'bg-blue-300';
        if (value === 'S' && showShips) return 'bg-gray-700';
        return 'bg-blue-100 hover:bg-blue-200';
    })();

    // combine classes for visual effect; shell-drop only active on highlight
    const shellDropClass = isHighlighted ? 'shell-drop' : '';
    const ringVariant = isHit ? 'hit-ring' : isMiss ? 'miss-ring' : '';
    const disabledClasses = disabled ? 'pointer-events-none opacity-80 cursor-not-allowed' : 'cursor-pointer';

    // symbol to show (still honor value)
    const symbol = value === 'X' ? '💥' : value === 'O' ? '•' : '';

    // generate 3 debris directions (random-ish but stable per render using memo)
    const debris = useMemo(() => {
        // small set of direction vectors
        const vectors = [
            { dx: '-8px', dy: '-12px' },
            { dx: '10px', dy: '-6px' },
            { dx: '-10px', dy: '8px' },
            { dx: '8px', dy: '10px' },
        ];
        // pick 3 random vectors
        const out = [];
        for (let i = 0; i < 3; i++) {
            const idx = Math.floor(Math.random() * vectors.length);
            out.push(vectors[idx]);
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [/* avoid re-calculating except on mount */]);

    return (
        <div
            onClick={() => !disabled && onClick(row, col)}
            className={`relative w-11 h-11 flex items-center justify-center border border-blue-500 rounded-sm select-none ${baseBg} ${shellDropClass} cell-smooth ${disabledClasses}`}
        >
            {/* Impact ring — shows only while highlighted */}
            {isHighlighted && (
                <div
                    className={`absolute inset-0 pointer-events-none impact-ring ${ringVariant}`}
                    style={{ borderRadius: 6 }}
                />
            )}

            {/* Debris - positioned absolute center, animated outward; only during highlight */}
            {isHighlighted &&
                debris.map((d, i) => (
                    <span
                        key={i}
                        className="debris"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            // set custom properties for the keyframe
                            // slight jitter to make it organic
                            ['--dx' as any]: `calc(${d.dx} * ${0.8 + Math.random() * 0.6})`,
                            ['--dy' as any]: `calc(${d.dy} * ${0.8 + Math.random() * 0.6})`,
                            background: isHit ? 'rgba(255,120,120,0.95)' : 'rgba(120,180,255,0.9)',
                            animationDelay: `${i * 40}ms`,
                        }}
                    />
                ))}

            {/* symbol (emoji) */}
            <span
                className={`relative z-10 text-sm ${isHighlighted ? 'symbol-pop' : ''}`}
                style={{
                    opacity: symbol ? 1 : 0,
                    transition: 'opacity 160ms ease',
                }}
            >
        {symbol}
      </span>
        </div>
    );
};

export default Cell;
