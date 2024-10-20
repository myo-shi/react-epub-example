type Theme = {
	fg: string;
	bg: string;
	link: string;
	isDark: boolean;
};
type GetCSSParams = {
	theme: Theme;
	lineHeight?: number | string;
	justify?: boolean;
	hyphenate?: boolean;
	invert?: boolean;
	overrideFont?: boolean;
	userStylesheet?: string;
	mediaActiveClass?: string;
};

// TODO: Make inverted colors
export const getCSS = ({
	theme,
	lineHeight = 1.5,
	justify = false,
	hyphenate = false,
	invert = false,
	overrideFont = false,
	userStylesheet = "",
	mediaActiveClass = "",
}: GetCSSParams) => [
	`
    @namespace epub "http://www.idpf.org/2007/ops";
    @media print {
        html {
            column-width: auto !important;
            height: auto !important;
            width: auto !important;
        }
    }
    @media screen {
        html {
            color-scheme: ${invert ? "only light" : "light dark"};
            color: ${theme.fg};
        }
				body {
					font-family: system-ui, sans-serif;
				}
        a:any-link {
            color: ${theme.link};
        }
        @media (prefers-color-scheme: dark) {
            html {
                color: ${invert ? theme.inverted.fg : theme.fg};
                ${invert ? "-webkit-font-smoothing: antialiased;" : ""}
            }
            a:any-link {
                color: ${invert ? theme.inverted.link : theme.link};
            }
        }
        aside[epub|type~="footnote"] {
            display: none;
        }
    }
    html {
        line-height: ${lineHeight};
        hanging-punctuation: allow-end last;
        orphans: 2;
        widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }
    :is(hgroup, header) p {
        text-align: unset;
        hyphens: unset;
    }
    pre {
        white-space: pre-wrap !important;
        tab-size: 2;
    }
`,
	`
        html, body {
            color: ${theme.fg} !important;
            background: none !important;
        }
        body * {
        }
        a:any-link {
            color: ${theme.link} !important;
        }
			${
				theme.isDark
					? `
        .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
            color: ${theme.fg} !important;
            background: color-mix(in hsl, ${theme.fg}, #000 50%) !important;
            background: color-mix(in hsl, ${theme.fg}, ${theme.bg} 75%) !important;
        }
				pre > code {
  					filter: invert(1) brightness(0.9) contrast(0.85) hue-rotate(180deg);
				}
						`
					: `
        svg, img {
            background-color: transparent !important;
            mix-blend-mode: multiply;
        }
        .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
            color: ${theme.fg} !important;
            background: color-mix(in hsl, ${theme.fg}, #fff 50%) !important;
            background: color-mix(in hsl, ${theme.fg}, ${theme.bg} 85%) !important;
        }
						`
			}
    p, li, blockquote, dd {
        line-height: ${lineHeight};
        text-align: ${justify ? "justify" : "start"};
        hyphens: ${hyphenate ? "auto" : "none"};
    }
    ${overrideFont ? "* { font-family: revert !important }" : ""}
${userStylesheet}
`,
];

// const getCSS = ({
// 	lineHeight = 1.5,
// 	justify = false,
// 	hyphenate = false,
// 	invert = false,
// 	theme = DEFAULT_THEME,
// 	overrideFont = false,
// 	userStylesheet = "",
// 	mediaActiveClass = "",
// }) => [
// 	`
//     @namespace epub "http://www.idpf.org/2007/ops";
//     @media print {
//         html {
//             column-width: auto !important;
//             height: auto !important;
//             width: auto !important;
//         }
//     }
//     @media screen {
//         html {
//             color-scheme: ${invert ? "only light" : "light dark"};
//             color: ${theme.light.fg};
//         }
//         a:any-link {
//             color: ${theme.light.link};
//         }
//         @media (prefers-color-scheme: dark) {
//             html {
//                 color: ${invert ? theme.inverted.fg : theme.dark.fg};
//                 ${invert ? "-webkit-font-smoothing: antialiased;" : ""}
//             }
//             a:any-link {
//                 color: ${invert ? theme.inverted.link : theme.dark.link};
//             }
//         }
//         aside[epub|type~="footnote"] {
//             display: none;
//         }
//     }
//     html {
//         line-height: ${lineHeight};
//         hanging-punctuation: allow-end last;
//         orphans: 2;
//         widows: 2;
//     }
//     [align="left"] { text-align: left; }
//     [align="right"] { text-align: right; }
//     [align="center"] { text-align: center; }
//     [align="justify"] { text-align: justify; }
//     :is(hgroup, header) p {
//         text-align: unset;
//         hyphens: unset;
//     }
//     pre {
//         white-space: pre-wrap !important;
//         tab-size: 2;
//     }
// `,
// 	`
//     @media screen and (prefers-color-scheme: light) {
//         ${
// 					theme.light.bg !== "#ffffff"
// 						? `
//         html, body {
//             color: ${theme.light.fg} !important;
//             background: none !important;
//         }
//         body * {
//             color: inherit !important;
//             border-color: currentColor !important;
//             background-color: ${theme.light.bg} !important;
//         }
//         a:any-link {
//             color: ${theme.light.link} !important;
//         }
//         svg, img {
//             background-color: transparent !important;
//             mix-blend-mode: multiply;
//         }
//         .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
//             color: ${theme.light.fg} !important;
//             background: color-mix(in hsl, ${theme.light.fg}, #fff 50%) !important;
//             background: color-mix(in hsl, ${theme.light.fg}, ${theme.light.bg} 85%) !important;
//         }`
// 						: ""
// 				}
//     }
//     @media screen and (prefers-color-scheme: dark) {
//         ${
// 					invert
// 						? ""
// 						: `
//         html, body {
//             color: ${theme.dark.fg} !important;
//             background: none !important;
//         }
//         body * {
//             color: inherit !important;
//             border-color: currentColor !important;
//             background-color: ${theme.dark.bg} !important;
//         }
//         a:any-link {
//             color: ${theme.dark.link} !important;
//         }
//         .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
//             color: ${theme.dark.fg} !important;
//             background: color-mix(in hsl, ${theme.dark.fg}, #000 50%) !important;
//             background: color-mix(in hsl, ${theme.dark.fg}, ${theme.dark.bg} 75%) !important;
//         }`
// 				}
//     }
//     p, li, blockquote, dd {
//         line-height: ${lineHeight};
//         text-align: ${justify ? "justify" : "start"};
//         hyphens: ${hyphenate ? "auto" : "none"};
//     }
//     ${overrideFont ? "* { font-family: revert !important }" : ""}
// ${userStylesheet}`,
// ];
