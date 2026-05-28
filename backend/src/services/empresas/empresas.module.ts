import { Module } from '@nestjs/common';
import { EmpresasController } from '../../routes/empresas.controller';
import { EmpresasService } from './empresas.service';

@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService],
})
export class EmpresasModule {}
