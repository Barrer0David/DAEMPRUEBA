// ============================================================
// dtos.route.ts
// DTOs de entrada (body y query) de todas las rutas del backend.
// Son `class` (no `interface`) porque los decoradores de class-validator
// se ejecutan en runtime: el ValidationPipe global instancia el DTO y
// dispara la validacion antes de que la request llegue al handler.
// ============================================================
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// =========================
// auth
// =========================

// POST /auth/login  body
export class LoginDto {
  @IsEmail({}, { message: 'El email no es valido' })
  email!: string;

  @IsString({ message: 'La password debe ser una cadena' })
  @IsNotEmpty({ message: 'La password es obligatoria' })
  password!: string;
}

// =========================
// empresas
// =========================

// GET /empresas?page=N&limit=M  query
// @Type convierte el string del query (?page=2) a number antes de validar.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser >= 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser >= 1' })
  @Max(100, { message: 'limit debe ser <= 100' })
  limit?: number;
}

// GET /empresas/:id/resumen?ejercicio=YYYY&mes=MM  query
// Rangos sanos: mes 1-12, ejercicio 2000-2100 (cualquier cosa fuera = 400).
export class ResumenQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ejercicio debe ser un entero' })
  @Min(2000, { message: 'ejercicio debe ser >= 2000' })
  @Max(2100, { message: 'ejercicio debe ser <= 2100' })
  ejercicio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mes debe ser un entero' })
  @Min(1, { message: 'mes debe estar entre 1 y 12' })
  @Max(12, { message: 'mes debe estar entre 1 y 12' })
  mes?: number;
}
