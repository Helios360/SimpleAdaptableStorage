export type ToastType = 'success' | 'error' | 'info';
export interface Toast {
	id: number;
	msg: string;
	type: ToastType;
}

let counter = 0;
const toasts = $state<Toast[]>([]);

export function pushToast(msg: string, type: ToastType = 'success') {
	const id = ++counter;
	toasts.push({ id, msg, type });
	setTimeout(() => {
		const i = toasts.findIndex((t) => t.id === id);
		if (i >= 0) toasts.splice(i, 1);
	}, 3500);
}

export function toastStore() {
	return toasts;
}
