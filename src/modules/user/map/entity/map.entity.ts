import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Country {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    country_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    object_id: string;
}


@Entity()
export class State {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    state_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    country_id: number;

    @Column()
    object_id: string;
}

@Entity()
export class District {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    district_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    state_id: number;

    @Column()
    object_id: string;
}

@Entity({ name: 'subdistrict' })
export class SubDistrict {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    subdistrict_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    district_id: number;

    @Column()
    object_id: string;
}

@Entity()
export class Village {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    village_name: string;

    @Column()
    state_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    subdistrict_id: number;

    @Column()
    object_id: string;
}
@Entity({name:'city'})
export class City {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    city_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    district_id: number;

    @Column()
    object_id: string;
}
@Entity()
export class Ward {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ward_name: string;

    @Column()
    geometries: string;

    @Column()
    properties: string;

    @Column()
    city_id: number;

    @Column()
    state_name: string;

    @Column()
    object_id: string;
}