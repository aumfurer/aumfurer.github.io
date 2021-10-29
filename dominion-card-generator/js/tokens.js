function tokenize(line, tokenPriority) {
    const rgx = new RegExp(tokenPriority.map(tc => tc.asPattern()).join('|'), 'gu')
    return [...line.matchAll(rgx)].map(m => tokenPriority.find(tc => m.groups[tc.name]).fromMatch(m))
}

class Token {
    static name;
    static pattern;

    /**
     * @param match
     * @returns {Token}
     */
    static fromMatch(match) {
        return new this(match.groups[this.name])
    }

    fontSize(ctx) {
        return Number.parseInt(ctx.font.match(/(\d+)px/)[1])
    }

    static asPattern() {
        return `(?<${this.name}>${this.pattern})`
    }

    /** @param {CanvasRenderingContext2D} ctx */
    height(ctx) {
    };

    /** @param {CanvasRenderingContext2D} ctx */
    width(ctx) {
    };

    breaksAfter() {
        return true
    };

    breaksBefore() {
        return true
    };

    /** @param {CanvasRenderingContext2D} ctx
     * @param {Number} x
     * @param {Number} y
     */
    paint(ctx, x, y) {
    };

    dbgBox(ctx, x, y) {
        ctx.beginPath();
        ctx.rect(x, y - this.height(ctx), this.width(ctx), this.height(ctx))
        ctx.stroke();
    }
}

class TokenWord extends Token {

    static name = "TokenWord"
    static pattern = "[(+]|\\S+"

    constructor(text) {
        super();
        this.text = text;
    }

    width(ctx) {
        return ctx.measureText(this.text).width
    }

    height(ctx) {
        return this.fontSize(ctx)
    }

    breaksAfter() {
        return !this.text.match(/[(+]$/)
    }

    breaksBefore() {
        return !this.text.match(/^[).,;:?!]$/)
    }

    paint(ctx, x, y) {
        ctx.save()
        ctx.fillText(this.text, x, y)
        ctx.restore()
    }
}

class JointToken extends Token {
    static name = "JointToken"
    static pattern = "\\S(?:~\\S)+"

    constructor(text) {
        super();
        this.chars = text.split('~');
    }

    width(ctx) {
        return Math.max(...this.chars.map(ch => ctx.measureText(ch).width))
    }

    height(ctx) {
        return this.fontSize(ctx)
    }

    breaksAfter() {
        return false
    }

    breaksBefore() {
        return false
    }

    paint(ctx, x, y) {
        ctx.save()
        ctx.textAlign = 'center'
        let w = this.width(ctx);
        for (const ch of this.chars) {
            ctx.fillText(ch, x + w / 2, y)
        }
        ctx.restore()
    }
}

class TokenKeyWord extends TokenWord {

    static name = "TokenKeyWord"
    static extraKeyWords = []

    static get pattern() {
        return `[+-]\\d+ \\p{Lu}\\p{Ll}*\\b`
    }

    width(ctx) {
        ctx.save()
        ctx.font = `700 ${this.fontSize(ctx) | 0}px Roman, Amiri`
        let result = super.width(ctx)
        ctx.restore()
        return result
    }

    paint(ctx, x, y) {
        ctx.save()
        ctx.font = `700 ${this.fontSize(ctx) | 0}px Roman, Amiri`
        ctx.fillText(this.text, x, y)
        ctx.restore()
    }
}

class TokenKeyWordSingle extends TokenKeyWord {
    static name = "TokenKeyWordSingle"

    static get pattern() {
        return '^' + super.pattern + '$'
    }

    fontSize(ctx) {
        return 1.2 * super.fontSize(ctx)
    }
}


class TokenLine extends Token {
    static name = "TokenLine"
    static pattern = "^[-]$"
    static WIDTH
    static THICKNESS

    height(ctx) {
        return Number.parseInt(ctx.font.match(/(\d+)px/)[1]) * 0.6
    };

    /** @param {CanvasRenderingContext2D} ctx */
    width(ctx) {
        return this.constructor.WIDTH
    };

    /** @param {CanvasRenderingContext2D} ctx
     * @param {Number} x
     * @param {Number} y
     */
    paint(ctx, x, y) {
        ctx.fillRect(x, y, this.width(ctx), this.constructor.THICKNESS)
    };
}

class TokenIcon extends Token {
    static name = "TokenIcon"

    static get pattern() {
        return `[${Object.keys(this.icons).join('')}](?:\\?|\\p{N}*)[+*]?`
    }

    static icons = {'$': 'black', '@': 'white', '^': 'black'}
    static img = {}

    /** @param {String} text */
    constructor(text) {
        super();
        this.icon = text.charAt(0)
        this.superIndex = text.match(/[+*]?$/)[0]
        this.text = text.slice(1).replace(/[+*]$/, '')
    }

    height(ctx) {
        return this.fontSize(ctx) * 0.90
    }

    width(ctx) {
        const img = this.constructor.img[this.icon]
        return (img.width / img.height) * this.fontSize(ctx)
    }

    fontForTextIcon(ctx) {
        let fs = 4 * this.fontSize(ctx) / (this.text.length + 3) | 0
        // return`${fs}px Minion Std`
        return `700 ${fs}px Token`

    }

    paint(ctx, x, y) {
        ctx.save()
        const img = this.constructor.img[this.icon]
        const scale = this.fontSize(ctx) / img.height;
        ctx.translate(x + this.width(ctx) / 2, y - this.height(ctx) / 2);
        ctx.scale(scale, scale)
        ctx.shadowColor = 'black'
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = scale * 2;
        ctx.shadowOffsetY = scale * 5;
        ctx.drawImage(img, -img.width / 2, -0.35 * img.height);
        ctx.scale(1 / scale, 1 / scale)
        ctx.font = this.fontForTextIcon(ctx)
        ctx.fillStyle = this.constructor.icons[this.icon]
        let fs = Number.parseInt(ctx.font.match(/(\d+)px/)[1])
        ctx.shadowColor = 'transparent'
        if (this.superIndex === '') {
            this.writeText(ctx, this.text, 0, 0.5 * fs)
        } else {
            let moveX = this.writeText(ctx, this.text, -3, 0.5 * fs)
            ctx.translate(moveX, 0.15 * fs)
            this.drawSuperIndex(ctx);
        }
        ctx.restore()
    }

    //write text and drawSuperIndex are done to make the font look like Minion

    writeText(ctx, text, x, y) {
        const kerning = 3;
        let kerning_count = text.length - 1 + ((text.match(/1(?!$)/g) || []).length)
        x -= (ctx.measureText(text).width - kerning * kerning_count) / 2
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            ctx.fillText(char, x, y)
            x += ctx.measureText(char).width - (char === '1' ? 2 : 1) * kerning;
        }
        return x
    }

    drawSuperIndex(ctx) {
        if (this.superIndex === '+') {
            ctx.scale(0.6, 0.6)
            ctx.fillText(this.superIndex, -5, 0)
        } else {
            ctx.beginPath();
            ctx.translate(5, -10)
            let angleStep = 2 * Math.PI / 5;
            let outer = 6
            let inner = 1.5
            ctx.moveTo(outer, 0);
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(outer * Math.cos(i * angleStep), outer * Math.sin(i * angleStep))
                ctx.lineTo(inner * Math.cos((i + 0.5) * angleStep), inner * Math.sin((i + 0.5) * angleStep))
            }
            ctx.closePath();
            ctx.fill();
        }
    }
}

class TokenIconBig extends TokenIcon {
    static name = "TokenIconBig"

    static get pattern() {
        return `^${super.pattern}$`
    }

    paint(ctx, x, y) {
        ctx.save()
        ctx.translate(0, -0.2 * this.height(ctx))
        super.paint(ctx, x, y);
        ctx.restore()
    }

    fontSize(ctx) {
        return 3 * super.fontSize(ctx);
    }

}