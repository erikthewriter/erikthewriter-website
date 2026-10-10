import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const journal=defineCollection({loader:glob({base:'./src/content/journal',pattern:'**/*.md'}),schema:z.object({title:z.string(),date:z.coerce.date(),description:z.string().default(''),category:z.string().default('Writing'),image:z.string().optional(),published:z.boolean().default(true),audioUrl:z.string().url().optional().or(z.literal(''))})});
const products=defineCollection({loader:glob({base:'./src/content/products',pattern:'**/*.md'}),schema:z.object({title:z.string(),description:z.string().default(''),category:z.string().default('Books'),image:z.string().optional(),amazonUrl:z.string().optional(),payhipUrl:z.string().optional(),otherLabel:z.string().optional(),otherUrl:z.string().optional(),published:z.boolean().default(true)})});
const media=defineCollection({loader:glob({base:'./src/content/media',pattern:'**/*.md'}),schema:z.object({title:z.string(),description:z.string().default(''),kind:z.enum(['Clip','Music','Video']).default('Clip'),image:z.string().optional(),url:z.string().optional(),published:z.boolean().default(true)})});
export const collections={journal,products,media};
