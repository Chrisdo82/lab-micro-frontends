import React from 'react';
import { KoliBri } from 'kolibri-v2-provider';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

export type NotificationState =
	| {
			/** Gibt an, was für eine Art von Notification angezeigt wird. */
			type: 'info' | 'success' | 'warning' | 'error';
			/** Wird als Überschrift für die Notification genutzt. */
			headline: string;
			/**
			 * Wird als Nachricht für die Notification genutzt.
			 *
			 * > Achtung: Die ReactNodes sollten keine CSS-Klassen enthalten, da die WebComponent von KoliBri nicht auf das CSS außerhalb des ShadowRoots zugreifen kann. Stattdessen solltest, du auf das `style`-Attribut zurückgreifen.
			 */
			message: ReactNode;
			/** Ein eindeutiger Identifier der Notification. Die `id` wird dazu benötigt, um die Notification mit `closeNotification` zu schließen. */
			id?: string;
	  }
	| { type: 401 | 403; headline?: never; message?: never; id?: never };

export type NotificationContextProps = {
	/** Enthält alle Notifications */
	notifications: NotificationState[];
	/** Fügt eine neue Notification hinzu */
	addNotification: (notification: NotificationState) => void | Promise<(() => void) | undefined>;
	/** Schließt eine einzelne Notification. */
	closeNotification: (id: string) => void;
	/** Setzt alle Notifications zurück */
	resetNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextProps>({
	notifications: [],
	addNotification: () => undefined,
	closeNotification: () => undefined,
	resetNotifications: () => null,
});

/**
 * Mit diesem Hook können neue Notifications hinzugefügt oder zurückgesetzt werden.
 *
 * > Achtung: Dieser Hook kann nur in Verbindung mit dem `FrontendProvider` verwendet werden.
 *
 * ```typescript
 * function App() {
 *   const { addNotification, resetNotifications } = useNotifications()
 *
 *   return (
 *     <Page>
 *       <Button _label='Error' onClick={() => addNotification({
 *         id: 'test-error-1',
 *         headline: 'Error',
 *         message: 'Das ist ein Error.',
 *         type: 'error'
 *       })} />
 *       <Button _label='Reset' onClick={() => resetNotifications()} _variant='danger' />
 *       <KomponenteXY />
 *     </Page>
 *   )
 * }
 * ```
 */
export function useNotifications() {
	return useContext(NotificationContext);
}

/**
 * Der `NotificationProvider` ist Teil des `FrontendProvider`-Contexts und muss nicht separat in die Anwendung eingebunden werden.
 *
 * Er stellt einen Context bereit, in dem alle aktuellen Notifications und Funktionen zur Verwaltung dieser gespeichert werden.
 * Mit dem `useNotifications`-Hook können Komponenten auf diesen Context zugreifen und Notifications hinzufügen, schließen oder zurücksetzen.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
	const [notifications, setNotifications] = useState<(NotificationState & { closeFn?: () => void })[]>([]);

	const value = useMemo<NotificationContextProps>(() => {
		const toaster = KoliBri.ToasterService.getInstance(document);
		return {
			notifications,
			addNotification: async (notification) => {
				if (notification.type === 401 || notification.type === 403) {
					setNotifications((old) => [...old.filter((o) => o.type !== 401 && o.type !== 403), { type: notification.type }]);
					return;
				}
				// before adding a new notification, close the old one with the same id
				if (notification.id && notifications.some((n) => n.id === notification.id)) {
					notifications.find((n) => n.id === notification.id)?.closeFn?.();
				}
				const closeFn = await toaster.enqueue({
					type: notification.type,
					label: notification.headline ?? '',
					description: typeof notification.message === 'string' ? notification.message : undefined,
					render:
						typeof notification.message !== 'string'
							? (ele: HTMLElement) => {
									const root = createRoot(ele, { identifierPrefix: 'notification' });
									root.render(<>{notification.message}</>);
								}
							: undefined,
				});

				setNotifications((old) => {
					const updatedNotifications = old.filter((n) => n.id !== notification.id);
					return [...updatedNotifications, { ...notification, closeFn }];
				});

				return closeFn;
			},
			closeNotification: (id) => {
				const found = notifications.find((n) => n.id === id);
				if (found) {
					found.closeFn?.();
					setNotifications((old) => old.filter((n) => n.id !== id));
				}
			},
			resetNotifications: () => {
				toaster.closeAll();
				setNotifications([]);
			},
		};
	}, [notifications]);

	useEffect(() => {
		const toaster = KoliBri.ToasterService.getInstance(document);
		return () => {
			toaster.closeAll();
			setNotifications([]);
		};
	}, []);

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
