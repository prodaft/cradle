

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
                className="block w-full text-gray-900 dark:text-gray-100 rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-400 placeholder:text-gray-400 focus:ring-3 focus:ring-inset focus:ring-cradle2 sm:text-sm sm:leading-6 bg-inherit"
                />
            </div>
        </div>
    );
}