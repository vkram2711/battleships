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

    const baseBg = (() => {
        if (value === 'X') return 'bg-red-500';
        if (value === 'O') return 'bg-blue-300';
        if (value === 'S' && showShips) return 'bg-gray-700';
        return 'bg-blue-100 hover:bg-blue-200';
    })();

    const shellDropClass = isHighlighted ? 'shell-drop' : '';
    const ringVariant = isHit ? 'hit-ring' : isMiss ? 'miss-ring' : '';
    const disabledClasses = disabled ? 'pointer-events-none opacity-80 cursor-not-allowed' : 'cursor-pointer';

    const symbol = value === 'X' ? '💥' : value === 'O' ? '•' : '';

    // debris data: for miss use round droplets; for hit use spikes
    const debrisData = useMemo(() => {
        if (isHit) {
            // generate 6 spikes with angles distributed around circle, add jitter
            const spikes = [];
            const baseAngles = [ -80, -40, -10, 10, 40, 80 ]; // degrees biased horizontally
            for (let i = 0; i < baseAngles.length; i++) {
                const jitter = (Math.random() - 0.5) * 18; // +/-9deg jitter
                const angle = baseAngles[i] + jitter;
                // distance outward in px (negative because spike-fly uses translateY)
                const dist = `${- (18 + Math.random() * 8)}px`;
                spikes.push({ angle: `${angle}deg`, dist });
            }
            return { kind: 'spikes', items: spikes };
        } else if (isMiss) {
            // generate 4 round droplets with dx/dy
            const vectors = [
                { dx: '-12px', dy: '-8px' },
                { dx: '10px', dy: '-10px' },
                { dx: '-10px', dy: '10px' },
                { dx: '12px', dy: '8px' },
            ];
            // randomize scale slightly
            const items = vectors.map(v => ({ dx: `calc(${v.dx} * ${0.9 + Math.random() * 0.4})`, dy: `calc(${v.dy} * ${0.9 + Math.random() * 0.4})` }));
            return { kind: 'round', items };
        }
        return { kind: 'none', items: [] };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHit, isMiss]);

    return (
        <div
            onClick={() => !disabled && onClick(row, col)}
            className={`relative w-12 h-12 flex items-center justify-center border border-blue-500 rounded-sm select-none ${baseBg} ${shellDropClass} cell-smooth ${disabledClasses}`}
        >
            {/* Impact ring */}
            {isHighlighted && (
                <div className={`absolute inset-0 impact-ring ${ringVariant}`} style={{ borderRadius: 6 }} />
            )}

            {/* Debris: spikes for hit, round droplets for miss */}
            {isHighlighted && debrisData.kind === 'round' && debrisData.items.map((d: any, i: number) => (
                <span
                    key={i}
                    className="debris-round"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        ['--dx' as any]: d.dx,
                        ['--dy' as any]: d.dy,
                        background: 'rgba(255,255,255,0.95)',
                        animationDelay: `${i * 30}ms`
                    } as React.CSSProperties}
                />
            ))}

            {isHighlighted && debrisData.kind === 'spikes' && debrisData.items.map((s: any, i: number) => (
                <span
                    key={i}
                    className={`spike ${isHit ? 'hit' : 'miss'}`}
                    style={{
                        ['--angle' as any]: s.angle,
                        ['--dist' as any]: s.dist,
                        animationDelay: `${i * 25}ms`,
                        // center the spike (we will rotate+translate it via keyframe)
                        transform: 'translate(-50%, -50%)'
                    } as React.CSSProperties}
                />
            ))}

            {/* symbol */}
            <span className={`relative z-10 text-base ${isHighlighted ? 'symbol-pop' : ''}`} style={{ opacity: symbol ? 1 : 0 }}>
        {symbol}
      </span>
        </div>
    );
};

export default Cell;
