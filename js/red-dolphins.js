const DolphinsTheme = (() => {
    function plate(width, height) {
        const flag = new createjs.Shape();
        const g = flag.graphics;
        function outline(right) {
            g.moveTo(12, 0).lineTo(right - 10, 0).quadraticCurveTo(right, 0, right - 3, 11)
                .lineTo(right - 12, height - 9).quadraticCurveTo(right - 15, height, right - 25, height)
                .lineTo(10, height).quadraticCurveTo(0, height, 2, height - 12).lineTo(9, 6)
                .quadraticCurveTo(10, 0, 12, 0).closePath();
        }
        g.beginLinearGradientFill(['#ff233d', '#a50023'], [0, 1], 0, 0, 0, height);
        outline(width);
        g.endFill().setStrokeStyle(1.5).beginStroke('#e9eef4')
            .beginLinearGradientFill(['#272e39', '#0d0f15'], [0, 1], 0, 0, 0, height);
        outline(width - 8);
        return flag;
    }

    function label(value, size, align) {
        const label = new createjs.Text(value, 'italic ' + size + 'px impact, sans-serif', '#ffffff');
        label.textAlign = align;
        label.textBaseline = 'middle';
        label.shadow = new createjs.Shadow('#0008', 0, 1, 2);
        return label;
    }

    function posts(points) {
        const container = new createjs.Container();
        const frame = new createjs.Shape();
        const [topLeft, left, right, topRight] = points;
        function lines() {
            frame.graphics.moveTo(topLeft.x, topLeft.y).lineTo(left.x, left.y).lineTo(left.x, 500)
                .moveTo(left.x, left.y).lineTo(right.x, right.y).lineTo(topRight.x, topRight.y)
                .moveTo(right.x, right.y).lineTo(right.x, 500);
        }
        frame.graphics.setStrokeStyle(18, 'round', 'round').beginStroke('#8992a0');
        lines();
        frame.graphics.endStroke().setStrokeStyle(12, 'round', 'round').beginStroke('#fbfdff');
        lines();
        container.addChild(frame);
        for (const point of [left, right]) {
            const pad = new createjs.Shape();
            pad.graphics.setStrokeStyle(1).beginStroke('#ff6173')
                .beginLinearGradientFill(['#71031b', '#dc0b30', '#9c0421'], [0, .5, 1], -23, 0, 23, 0)
                .drawRoundRect(-23, 0, 46, 141, 8);
            pad.set({x: point.x, y: 359});
            const word = label('HINO', 31, 'center');
            word.set({x: point.x, y: 427, rotation: -90});
            container.addChild(pad, word);
        }
        return container;
    }

    function bitmap(width, height, paint) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        paint(canvas.getContext('2d'));
        return canvas.toDataURL();
    }

    function rounded(ctx, x, y, w, h, r, fill, stroke, width = 1) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = width;
            ctx.stroke();
        }
    }

    function gradient(ctx, x0, y0, x1, y1, colors) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
        return g;
    }

    function ball(ctx, x, y, width, height, spin, branding) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(width / 100, height / 155);
        ctx.beginPath();
        ctx.ellipse(50, 77.5, 47, 75, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient(ctx, 0, 0, 100, 100, ['#747d88', '#fff', '#eff1f3', '#9ea7b0']);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#ba0329';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(60 + spin, -6);
        ctx.bezierCurveTo(18 + spin, 41, 3 + spin, 109, 30 + spin, 159);
        ctx.moveTo(100 + spin, 51);
        ctx.bezierCurveTo(82 + spin, 108, 63 + spin, 129, 44 + spin, 159);
        ctx.stroke();
        ctx.strokeStyle = '#232631';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(68 + spin, -6);
        ctx.bezierCurveTo(26 + spin, 41, 11 + spin, 109, 38 + spin, 159);
        ctx.stroke();
        if (branding) {
            ctx.translate(58 + spin * .32, 85);
            ctx.rotate(-.42);
            ctx.fillStyle = '#13151c';
            ctx.textAlign = 'center';
            ctx.font = 'bold 15px Impact, sans-serif';
            ctx.fillText('RED', 0, -4);
            ctx.font = 'bold 12px Impact, sans-serif';
            ctx.fillText('DOLPHINS', 0, 10);
        }
        ctx.restore();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#313440';
        ctx.beginPath();
        ctx.ellipse(50, 77.5, 47, 75, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function meter(ctx, length, vertical) {
        if (vertical) {
            ctx.translate(14, 0);
            ctx.rotate(Math.PI / 2);
        }
        rounded(ctx, 1, 1, length - 2, 12, 6, '#101015', '#ffffff', 1.5);
        const step = (length - 10) / 30;
        for (let i = 0; i < 30; i++) {
            const color = i >= 14 && i <= 15 ? '#a0ed14' : '#f51434';
            rounded(ctx, 5 + i * step, 4.2, step - 1, 5.6, 1, color);
        }
    }

    function button(ctx, x, icon, alternate) {
        ctx.save();
        ctx.translate(x, 0);
        rounded(ctx, 2, 2, 56, 56, 10, gradient(ctx, 0, 0, 0, 60, ['#3b414c', '#111218']), '#f2f3f8', 1.6);
        ctx.fillStyle = '#e91237';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.7;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (icon === 'exit') {
            ctx.moveTo(15, 13); ctx.lineTo(25, 13); ctx.lineTo(30, 22); ctx.lineTo(35, 13);
            ctx.lineTo(45, 13); ctx.lineTo(35, 30); ctx.lineTo(46, 47); ctx.lineTo(36, 47);
            ctx.lineTo(30, 37); ctx.lineTo(24, 47); ctx.lineTo(14, 47); ctx.lineTo(25, 30);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (icon === 'audio') {
            ctx.moveTo(12, 23); ctx.lineTo(20, 23); ctx.lineTo(29, 15); ctx.lineTo(29, 45);
            ctx.lineTo(20, 37); ctx.lineTo(12, 37); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath();
            if (alternate) {
                ctx.moveTo(37, 24); ctx.lineTo(47, 36); ctx.moveTo(47, 24); ctx.lineTo(37, 36);
            } else {
                ctx.arc(30, 30, 10, -.9, .9); ctx.moveTo(40, 17); ctx.arc(30, 30, 16, -.9, .9);
            }
            ctx.stroke();
        } else {
            for (const angle of [0, 90, 180, 270]) {
                ctx.save(); ctx.translate(30, 30); ctx.rotate(angle * Math.PI / 180);
                ctx.beginPath(); ctx.moveTo(16, -18); ctx.lineTo(4, -15); ctx.lineTo(9, -10);
                ctx.lineTo(1, -2); ctx.lineTo(5, 2); ctx.lineTo(13, -6); ctx.lineTo(18, -1);
                ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }
        }
        ctx.restore();
    }

    function sprite(key) {
        switch (key) {
            case 'ball': return null;
            case 'ball_holder':
                return bitmap(325, 157, ctx => {
                    ctx.translate(84, 88);
                    ctx.fillStyle = gradient(ctx, -55, 0, 60, 0, ['#6f011b', '#f52a46', '#89001e']);
                    ctx.beginPath();
                    ctx.moveTo(-43, -17); ctx.quadraticCurveTo(0, 5, 43, -17);
                    ctx.lineTo(60, 29); ctx.quadraticCurveTo(0, 54, -60, 29); ctx.closePath();
                    ctx.fill();
                });
            case 'top_bar': return bitmap(383, 14, ctx => meter(ctx, 383, false));
            case 'right_bar': return bitmap(14, 274, ctx => meter(ctx, 274, true));
            case 'arrow_bar': return bitmap(24, 42, ctx => ball(ctx, 1, 1, 22, 40, 0, false));
            case 'but_exit': return bitmap(60, 60, ctx => button(ctx, 0, 'exit', false));
            case 'audio_icon': return bitmap(120, 60, ctx => {button(ctx, 0, 'audio', false); button(ctx, 60, 'audio', true);});
            case 'but_fullscreen': return bitmap(120, 60, ctx => {button(ctx, 0, 'fullscreen', false); button(ctx, 60, 'fullscreen', true);});
            default: return null;
        }
    }

    // Keep all 38 original poses; match skin to the edited Japanese-player reference
    // and tint the original cyan fabric red. Preserve alpha and muscle shading.
    function uniformFrame(original) {
        const canvas = document.createElement('canvas');
        canvas.width = original.width;
        canvas.height = original.height;
        const context = canvas.getContext('2d');
        context.drawImage(original, 0, 0);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = frame.data;
        for (let offset = 0; offset < pixels.length; offset += 4) {
            const red = pixels[offset];
            const green = pixels[offset + 1];
            const blue = pixels[offset + 2];
            if (!pixels[offset + 3]) continue;
            if (red > green + 8 && green > blue + 3) {
                const skin = Math.min(1, (red - green - 8) / 18, (green - blue - 3) / 10);
                pixels[offset] = red + (100 + red * .66 - red) * skin;
                pixels[offset + 1] = green + (76 + green * .85 - green) * skin;
                pixels[offset + 2] = blue + (58 + blue * .88 - blue) * skin;
                continue;
            }
            if (green <= red || blue <= green) continue;
            const chroma = Math.min(green - red, blue - red);
            if (chroma < 12) continue;
            const fabric = Math.min(1, (chroma - 12) / 28);
            const targetRed = red + (blue - red) * 0.86;
            const targetGreen = red + (green - red) * 0.035;
            const targetBlue = red + (blue - red) * 0.16;
            pixels[offset] = red + (targetRed - red) * fabric;
            pixels[offset + 1] = green + (targetGreen - green) * fabric;
            pixels[offset + 2] = blue + (targetBlue - blue) * fabric;
        }
        context.putImageData(frame, 0, 0);
        return canvas;
    }


    // Pack the supplied 4x3 rotation atlas into the game's original 2x6 frame layout.
    function ballFrames(atlas) {
        const source = document.createElement('canvas');
        source.width = atlas.width;
        source.height = atlas.height;
        const sourceContext = source.getContext('2d');
        sourceContext.drawImage(atlas, 0, 0);
        const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
        const sheet = document.createElement('canvas');
        sheet.width = 412;
        sheet.height = 1890;
        const context = sheet.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        for (let frame = 0; frame < 12; frame++) {
            const cellLeft = Math.round(frame % 4 * atlas.width / 4);
            const cellRight = Math.round((frame % 4 + 1) * atlas.width / 4);
            const cellTop = Math.round(Math.floor(frame / 4) * atlas.height / 3);
            const cellBottom = Math.round((Math.floor(frame / 4) + 1) * atlas.height / 3);
            let left = cellRight, right = cellLeft, top = cellBottom, bottom = cellTop;
            for (let y = cellTop; y < cellBottom; y++) {
                for (let x = cellLeft; x < cellRight; x++) {
                    if (pixels[(y * atlas.width + x) * 4 + 3] < 128) continue;
                    left = Math.min(left, x); right = Math.max(right, x);
                    top = Math.min(top, y); bottom = Math.max(bottom, y);
                }
            }
            if (right < left || bottom < top) throw Error('Empty ball frame ' + frame);
            const width = right - left + 1, height = bottom - top + 1;
            const scale = Math.min(198 / width, 307 / height);
            const targetWidth = width * scale, targetHeight = height * scale;
            context.drawImage(source, left, top, width, height,
                frame % 2 * 206 + (206 - targetWidth) / 2,
                Math.floor(frame / 2) * 315 + (315 - targetHeight) / 2,
                targetWidth, targetHeight);
        }
        return sheet;
    }

    return {plate, label, posts, sprite, uniformFrame, ballFrames};
})();
