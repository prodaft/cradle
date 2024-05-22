/**
 * FormField component - a styled form field with a label and input
 * @param props
<<<<<<< HEAD
 * @returns {FormField}
=======
 * @returns {JSX.Element}
>>>>>>> main
 * @constructor
 */
export default function FormField(props) {
    return (
        <div className="w-full">
            <label htmlFor={props.name} className="block text-sm font-medium leading-6">
                {props.labelText}
            </label>
            <div className="mt-2">
                <input
                id={props.name}
                name={props.name}
                type={props.type}
                autoComplete={props.name}
                onChange={(e) => props.handleInput(e.target.value)}
                required
                className="input-ghost-primary input-block input focus:ring-0"
                />
            </div>
        </div>
    );
}