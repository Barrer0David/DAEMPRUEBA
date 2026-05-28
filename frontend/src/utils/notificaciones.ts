import Swal from 'sweetalert2';

/**
 * Summary: Muestra al usuario el popup estandar de "mantenimiento". Se
 * usa como mensaje generico cuando alguna parte de la app falla y no
 * queremos exponer el detalle tecnico real. Resuelve la promesa cuando
 * el usuario cierra el modal, asi quien la llame puede encadenar logica
 * post-mensaje sin acoplarse a la API de SweetAlert2.
 *
 * Parameters: (ninguno)
 *
 * Return: Promise<void> — resuelve al cerrar el modal.
 */
export function mostrarErrorMantenimiento(): Promise<void> {
  return Swal.fire({
    icon: 'error',
    text: `Estamos arreglando este problema. Por favor, contacta a soporte. Extension: 123 - prueba.`,
    confirmButtonText: 'Entendido',
  }).then(() => undefined);
}
