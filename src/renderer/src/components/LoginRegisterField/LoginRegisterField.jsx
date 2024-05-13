

export default function LoginRegisterField(props) {
    return (
        <div>
            <label htmlFor={props.name} className="block text-sm font-medium leading-6">
                {props.labelText}
            </label>
            <div className="mt-2">
                <input
                placeholder="Type here"
                id={props.name}
                name={props.name}
                type={props.type}
                autoComplete={props.name}
                onChange={(e) => props.handleInput(e.target.value)}
                required
                className="input-ghost-primary input focus:ring-0"
                />
            </div>
        </div>
    );
}