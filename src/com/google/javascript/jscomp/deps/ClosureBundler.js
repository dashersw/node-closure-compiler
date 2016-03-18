/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CharSource from 'com/google/common/io/CharSource';
import Files from 'com/google/common/io/Files';

import File from 'java/io/File';
import Charset from 'java/nio/charset/Charset';


/**
 * A utility class to assist in creating JS bundle files.
 */
export default class ClosureBundler {
    constructor() {
        /** @private {Boolean} */
        this.useEval_ = false;

        /** @private {String} */
        this.sourceUrl_ = null;
    }

    /**
     * @final
     * @param {Boolean} useEval
     * @return {ClosureBundler}
     */
    useEval(useEval) {
        this.useEval_ = useEval;
        return this;
    }

    /**
     * @final
     * @param {String} sourceUrl
     * @returns {ClosureBundler}
     */
    withSourceUrl(sourceUrl) {
        this.sourceUrl_ = sourceUrl;
        return this;
    }

    /**
     * Append the contents of the string to the supplied appendable.
     * @param {Appendable} out
     * @param {DependencyInfo} info
     * @param {String} contents
     */
    static appendInput(out, info, contents) {
        new ClosureBundler().appendTo(out, info, contents);
    }

    /**
     * Append the contents of the file to the supplied appendable.
     * @param {Appendable} out
     * @param {DependencyInfo} info
     * @param {String|File|CharSource} content
     * @param {Charset=} contentCharset
     */
    appendTo(out, info, content, contentCharset) {
        if (content instanceof File) {
            content = Files.asCharSource(content, contentCharset);
        } else if (!(content instanceof CharSource)) {
            content = CharSource.wrap(content);
        }

        if (info.isModule()) {
            this.appendGoogModule(out, content);
        } else {
            this.appendTraditional(out, content);
        }
    }

    /**
     * @param {Appendable} out
     * @param {CharSource} contents
     * @private
     */
    appendTraditional_(out, contents) {
        if (this.useEval_) {
            out.append("(0,eval(\"");
            this.append(out, Mode.ESCAPED, contents);
            this.appendSourceUrl(out, Mode.ESCAPED);
            out.append("\"));");
        } else {
            this.append(out, Mode.NORMAL, contents);
            this.appendSourceUrl(out, Mode.NORMAL);
        }
    }

    /**
     *
     * @param {Appendable} out
     * @param {Mode} mode
     * @param {string|CharSource} s
     */
    append(out, mode, s) {
        if (s instanceof CharSource) {
            s = s.read();
        }
        let transformed = this.transformInput(s);
        mode.append(transformed, out);
    }

    /**
     * @param {Appendable} out
     * @param {Mode} mode
     */
    appendSourceUrl(out, mode) {
        if (this.sourceUrl_ == null) {
            return;
        }
        let toAppend = "\n//# sourceURL=" + sourceUrl + "\n";
        // Don't go through #append. That method relies on #transformInput,
        // but source URLs generally aren't valid JS inputs.
        mode.append(toAppend, out);
    }

    /**
     * Template method. Subclasses that need to transform the inputs should override this method.
     * (For example, {@link TranspilingClosureBundler#transformInput} transpiles inputs from ES6
     * to ES5.)
     *
     * @param {string} input
     */
    transformInput(input) {
        return input;
    }
}

/**
 * @interface Mode
 */
class ModeInterface {
    append() {}
}


/**
 * @enum {Mode}
 */
const Mode = {
    ESCAPED: class {
        /**
         * @param {string} s
         * @param {Appendable} out
         */
        append(s, out) {
            out.append(SourceCodeEscapers.javascriptEscaper().escape(s));
        }
    },
    NORMAL: class {
        /**
         * @param {string} s
         * @param {Appendable} out
         */
        append(s, out) {
            out.append(s);
        }
    }
};
