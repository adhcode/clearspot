import { IsString, IsNumber, IsArray, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  address!: string;

  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];

  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;
}
