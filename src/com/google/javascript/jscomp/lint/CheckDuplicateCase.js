import AbstractCompiler from 'com/google/javascript/jscomp/AbstractCompiler';
import DiagnosticType from 'com/google/javascript/jscomp/DiagnosticType';
import HotSwapCompilerPass from 'com/google/javascript/jscomp/HotSwapCompilerPass';
import {NodeTraversal, AbstractPostOrderCallback} from 'com/google/javascript/jscomp/NodeTraversal';
import Node from 'com/google/javascript/rhino/Node';


/**
 * Check for duplicate case labels in a switch statement
 * Eg:
 *   switch (foo) {
 *     case 1:
 *     case 1:
 *   }
 *
 * This is normally an indication of a programmer error.
 *
 * Inspired by ESLint (https://github.com/eslint/eslint/blob/master/lib/rules/no-duplicate-case.js)
 */
export default class CheckDuplicateCase extends AbstractPostOrderCallback {
    /**
     * @type {DiagnosticType}
     */
    static get DUPLICATE_CASE() {
        return DiagnosticType.warning("JSC_DUPLICATE_CASE", "Duplicate case in a switch statement.");
    }


    /**
     * @implements {HotSwapCompilerPass}
     * @param {AbstractCompiler} compiler
     */
    constructor(compiler) {
        super();
        this.compiler_ = compiler;
    }

    /**
     * @override
     * @param {Node} externs
     * @param {Node} root
     */
    process(externs, root) {
        NodeTraversal.traverseEs6(this.compiler_, root, this);
    }

    /**
     * @override
     * @param {Node} scriptRoot
     * @param {Node} originalRoot
     */
    hotSwapScript(scriptRoot, originalRoot) {
        NodeTraversal.traverseEs6(this.compiler_, scriptRoot, this);
    }

    /**
     * @override
     * @param {NodeTraversal} t
     * @param {Node} n
     * @param {Node} parent
     */
    visit(t, n, parent) {
        if (n.isSwitch()) {
            let cases = new Set();
            for (curr = n.getSecondChild(); curr != null; curr = curr.getNext()) {
                source = this.compiler.toSource(curr.getFirstChild());
                if (cases.has(source)) {
                    t.report(curr, CheckDuplicateCase.DUPLICATE_CASE);
                }
                cases.add(source);
            }
        }
    }
}
