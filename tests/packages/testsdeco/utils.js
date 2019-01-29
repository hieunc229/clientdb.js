/**
 * Method use to create HTML element
 * @param {string} tagName 
 * @param { children: Array<HTMLElement> | HTMLElement, onClick: Function, className: string, styles.string} options 
 */
function createElement(tagName, options) {
    var element = document.createElement(tagName);

    if (options) {
        let { children, onClick, className, styles, innerText, ...rest } = options;
        if (children) {
            
            if (Array.isArray(children)) {
                children.forEach(item => element.appendChild(item));
            } else {
                element.appendChild(children);
            }
        }

        if (className) {
            element.className = className;
        }

        if (onClick) {
            element.onclick = onClick;
        }

        if (styles) {
            element.setAttribute('style', styles);
        }

        if (innerText) {
            element.innerText = innerText;
        }

        if (rest) {
            for (let prop in rest) {
                element.setAttribute(prop, rest[prop]);
            }
        }
    }

    return element;
}

export {
    createElement
}