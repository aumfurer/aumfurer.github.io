const TOKEN_PRIORITY = [
    TokenLine,
    TokenIconBig, BigTokenIconVP,
    TokenIcon, TokenIconVP,
    TokenKeyWordSingle, TokenKeyWord,
    JointToken,
    TokenWord
]

roman = fs => `${fs | 0}px Roman, Amiri`

class TokenArray {
    /** @param {Token[]} tokens
     * @param {boolean} useSpaces
     */
    constructor(tokens, useSpaces = true) {
        this.tokens = tokens
        this.spaceQty = tokens.reduce((acc, t, i) => {
            return acc + (i <= tokens.length - 2 && t.breaksAfter() && tokens[i + 1].breaksBefore())
        }, 0)
        this.useSpaces = useSpaces
    }

    height(ctx) {
        return Math.max(...this.tokens.map(t => t.height(ctx)), 0)
    }

    width(ctx) {
        let width = this.tokens.reduce((acc, t) => acc + t.width(ctx), 0)
        if (this.useSpaces)
            width += this.spaceQty * this.getSpaceWidth(ctx)
        return width
    }

    getSpaceWidth(ctx) {
        return ctx.measureText(' ').width;
    }

    paint(ctx, x, y) {
        const spaceWidth = this.getSpaceWidth(ctx)
        this.tokens.forEach((t, i) => {
            t.paint(ctx, x, y)
            x += t.width(ctx)
            if (this.useSpaces && t.breaksAfter() && i + 1 < this.tokens.length && this.tokens[i + 1].breaksBefore())
                x += spaceWidth
        })
    }
}


class DescriptionWriter {

    constructor(ctx, text, config) {
        this.ctx = ctx
        this.text = text
        this.x = config.x
        this.y = config.y
        this.width = config.width
        this.height = config.height
        this.fontSize = config.fontSize
    }

    font() {
        return roman(this.fontSize)
    }

    writeText() {
        this.ctx.save()
        /** @type {TokenArray[]} lines */
        let lines;
        this.fontSize /= 0.9
        let tokenizedLines = this.splitTextIntoTokenizedLines()
        let height;
        do {
            this.fontSize *= 0.9
            this.ctx.font = this.font()
            lines = tokenizedLines.map(ls => this.makeLine(ls)).flat()
            height = lines.reduce((acc, l) => acc + l.height(this.ctx), 0)
        } while (height > this.height)

        let offset = 0;
        lines.forEach(line => {
            let x = (this.width - line.width(this.ctx)) / 2
            offset += line.height(this.ctx)
            line.paint(this.ctx, this.x + x, this.y + (this.height - height) / 2 + offset)
        })
        this.ctx.restore()
    }

    splitTextIntoTokenizedLines() {
        return this.text
            .split('\n')
            .map(l => l.trim())
            .map(l => tokenize(l, TOKEN_PRIORITY))
    }

    /** @param {Token[]} tokens */
    makeLine(tokens) {
        const spaceWidth = this.ctx.measureText(' ').width

        let result = []
        let currentLine = []
        let currentWidth = 0

        TokenLine.WIDTH = this.width * 0.8
        TokenLine.THICKNESS = Math.min(this.width, this.height) / 100

        for (let i = 0; i < tokens.length; i++) {
            let bunch = [tokens[i]]
            while (i < tokens.length - 1 && (!tokens[i].breaksAfter() || !tokens[i + 1].breaksBefore())) {
                i++
                bunch.push(tokens[i])
            }
            let bunchWidth = bunch.reduce((acc, token) => acc + token.width(this.ctx), 0)
            if (currentLine.length === 0) {
                currentLine = bunch
                currentWidth = bunchWidth
            } else if (currentWidth + spaceWidth + bunchWidth < this.width) {
                currentLine.push(...bunch)
                currentWidth += spaceWidth + bunchWidth
            } else {
                result.push(new TokenArray(currentLine))
                currentLine = bunch
                currentWidth = bunchWidth
            }
        }
        if (currentLine.length > 0)
            result.push(new TokenArray(currentLine))

        return result
    }

}